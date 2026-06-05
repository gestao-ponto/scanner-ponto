import { supabase } from '@/services/supabase/client'
import {
  getPendingSyncs,
  removePendingSync,
  incrementSyncRetry,
  getUnsyncedRecords,
  markRecordSynced,
} from '@/services/supabase/localDb'
import type { WorkRecord } from '@/types'

const MAX_RETRIES = 5

// ─── Processar fila de sincronização pendente ─────────────────────────────────

export async function processSyncQueue(): Promise<{ synced: number; failed: number }> {
  const pending = await getPendingSyncs()
  let synced = 0
  let failed = 0

  for (const item of pending) {
    if (item.tentativas >= MAX_RETRIES) {
      await removePendingSync(item.id)
      failed++
      continue
    }

    try {
      if (item.tipo === 'insert') {
        const { error } = await supabase.from(item.tabela).insert(item.payload)
        if (error) throw error
      } else if (item.tipo === 'update') {
        const { id, ...rest } = item.payload as { id: string } & Record<string, unknown>
        const { error } = await supabase.from(item.tabela).update(rest).eq('id', id)
        if (error) throw error
      } else if (item.tipo === 'delete') {
        const { error } = await supabase
          .from(item.tabela)
          .delete()
          .eq('id', (item.payload as { id: string }).id)
        if (error) throw error
      }

      await removePendingSync(item.id)
      synced++
    } catch {
      await incrementSyncRetry(item.id)
      failed++
    }
  }

  return { synced, failed }
}

// ─── Sincronizar work_records não sincronizados ───────────────────────────────

export async function syncWorkRecords(): Promise<void> {
  const unsynced = await getUnsyncedRecords()
  if (unsynced.length === 0) return

  for (const record of unsynced) {
    try {
      // Tenta upsert no Supabase
      const { error } = await supabase.from('work_records').upsert({
        id: record.id,
        user_id: record.user_id,
        data: record.data,
        hora: record.hora,
        tipo: record.tipo,
        origem: record.origem,
        criado_at: record.criado_at,
      })

      if (!error) {
        await markRecordSynced(record.id)
      }
    } catch {
      // Manter na fila para próxima tentativa
    }
  }
}

// ─── Listener de conectividade ────────────────────────────────────────────────

let syncTimeout: ReturnType<typeof setTimeout> | null = null

export function initSyncListener(): () => void {
  const handleOnline = () => {
    // Debounce para evitar múltiplas chamadas em reconexão
    if (syncTimeout) clearTimeout(syncTimeout)
    syncTimeout = setTimeout(async () => {
      await syncWorkRecords()
      await processSyncQueue()
    }, 2000)
  }

  window.addEventListener('online', handleOnline)

  // Tentar sincronizar imediatamente se já online
  if (navigator.onLine) {
    handleOnline()
  }

  return () => {
    window.removeEventListener('online', handleOnline)
    if (syncTimeout) clearTimeout(syncTimeout)
  }
}

// ─── Pull: baixar registros do servidor para IndexedDB ────────────────────────

export async function pullRecordsFromServer(
  userId: string,
  inicio: string,
  fim: string
): Promise<WorkRecord[]> {
  const { data, error } = await supabase
    .from('work_records')
    .select('*')
    .eq('user_id', userId)
    .gte('data', inicio)
    .lte('data', fim)
    .order('data', { ascending: true })
    .order('hora', { ascending: true })

  if (error) throw error
  return (data ?? []) as WorkRecord[]
}
