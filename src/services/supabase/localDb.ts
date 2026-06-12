import { openDB, type IDBPDatabase } from 'idb'
import type { WorkRecord, PendingSync } from '@/types'

const DB_NAME = 'scanner-ponto-db'
const DB_VERSION = 1

let db: IDBPDatabase | null = null

export async function getDB(): Promise<IDBPDatabase> {
  if (db) return db
  db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(database) {
      // Registros de ponto locais
      if (!database.objectStoreNames.contains('work_records')) {
        const store = database.createObjectStore('work_records', { keyPath: 'id' })
        store.createIndex('by_data', 'data')
        store.createIndex('by_user', 'user_id')
        store.createIndex('by_sync', 'sincronizado')
      }
      // Fila de sincronização pendente
      if (!database.objectStoreNames.contains('pending_sync')) {
        const syncStore = database.createObjectStore('pending_sync', { keyPath: 'id' })
        syncStore.createIndex('by_tabela', 'tabela')
      }
      // Perfil cacheado
      if (!database.objectStoreNames.contains('profile')) {
        database.createObjectStore('profile', { keyPath: 'id' })
      }
    },
  })
  return db
}

// ─── WorkRecords ─────────────────────────────────────────────────────────────

export async function saveRecordLocal(record: WorkRecord): Promise<void> {
  const database = await getDB()
  await database.put('work_records', { ...record, sincronizado: false, pendente_sync: true })
}

export async function getRecordsByPeriodo(inicio: string, fim: string): Promise<WorkRecord[]> {
  const database = await getDB()
  const all = await database.getAll('work_records')
  return all
    .filter((r: WorkRecord) => r.data >= inicio && r.data <= fim)
    .sort((a: WorkRecord, b: WorkRecord) => {
      if (a.data !== b.data) return a.data.localeCompare(b.data)
      return a.hora.localeCompare(b.hora)
    })
}

export async function getUnsyncedRecords(): Promise<WorkRecord[]> {
  const database = await getDB()
  const all = await database.getAll('work_records')
  return all.filter((r: WorkRecord) => !r.sincronizado)
}

export async function markRecordSynced(id: string): Promise<void> {
  const database = await getDB()
  const record = await database.get('work_records', id)
  if (record) {
    await database.put('work_records', { ...record, sincronizado: true, pendente_sync: false })
  }
}

export async function deleteRecordLocal(id: string): Promise<void> {
  const database = await getDB()
  await database.delete('work_records', id)
}
export async function clearAllRecordsLocal(): Promise<void> {
  const database = await getDB()
  const tx = database.transaction(['work_records', 'pending_sync'], 'readwrite')
  await Promise.all([
    tx.objectStore('work_records').clear(),
    tx.objectStore('pending_sync').clear(),
    tx.done,
  ])
}

export async function upsertRecordsLocal(records: WorkRecord[]): Promise<void> {
  const database = await getDB()
  const tx = database.transaction('work_records', 'readwrite')
  await Promise.all([
    ...records.map((r) => tx.store.put({ ...r, sincronizado: true, pendente_sync: false })),
    tx.done,
  ])
}

// ─── Pending Sync ─────────────────────────────────────────────────────────────

export async function enqueuePendingSync(item: Omit<PendingSync, 'tentativas' | 'criado_at'>): Promise<void> {
  const database = await getDB()
  await database.put('pending_sync', {
    ...item,
    tentativas: 0,
    criado_at: new Date().toISOString(),
  })
}

export async function getPendingSyncs(): Promise<PendingSync[]> {
  const database = await getDB()
  return database.getAll('pending_sync')
}

export async function removePendingSync(id: string): Promise<void> {
  const database = await getDB()
  await database.delete('pending_sync', id)
}

export async function incrementSyncRetry(id: string): Promise<void> {
  const database = await getDB()
  const item = await database.get('pending_sync', id)
  if (item) {
    await database.put('pending_sync', { ...item, tentativas: (item.tentativas ?? 0) + 1 })
  }
}

// ─── Profile cache ────────────────────────────────────────────────────────────

export async function cacheProfile(profile: unknown): Promise<void> {
  const database = await getDB()
  await database.put('profile', profile)
}

export async function getCachedProfile(): Promise<unknown | null> {
  const database = await getDB()
  const all = await database.getAll('profile')
  return all[0] ?? null
}
// ─── Clear all (logout) ───────────────────────────────────────────────────────

export async function clearAllLocalData(): Promise<void> {
  const database = await getDB()
  const tx = database.transaction(['work_records', 'pending_sync', 'profile'], 'readwrite')
  await Promise.all([
    tx.objectStore('work_records').clear(),
    tx.objectStore('pending_sync').clear(),
    tx.objectStore('profile').clear(),
    tx.done,
  ])
  db = null // força reabertura limpa na próxima sessão
}