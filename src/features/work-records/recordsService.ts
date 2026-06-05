import { v4 as uuid } from 'uuid'
import { supabase } from '@/services/supabase/client'
import {
  saveRecordLocal,
  getRecordsByPeriodo,
  deleteRecordLocal,
  upsertRecordsLocal,
  enqueuePendingSync,
  markRecordSynced,
} from '@/services/supabase/localDb'
import { pullRecordsFromServer } from './syncService'
import { atribuirTipos } from '@/features/work-records/calculations'
import type { WorkRecord, OrigemMarcacao } from '@/types'

const DEBUG = import.meta.env.DEV
function dbg(...args: unknown[]) {
  if (DEBUG) console.log('[recordsService]', ...args)
}

// ─── Garantir formato HH:mm:ss para coluna TIME do Supabase ──────────────────

function horaParaTime(hora: string): string {
  const partes = hora.split(':')
  if (partes.length === 2) return `${partes[0].padStart(2,'0')}:${partes[1].padStart(2,'0')}:00`
  if (partes.length === 3) return `${partes[0].padStart(2,'0')}:${partes[1].padStart(2,'0')}:${partes[2].padStart(2,'0')}`
  return hora
}

// ─── Adicionar registro ───────────────────────────────────────────────────────

export async function adicionarRegistro(
  userId: string,
  data: string,
  hora: string,
  origem: OrigemMarcacao
): Promise<WorkRecord> {
  const horaFormatada = horaParaTime(hora)
  dbg('adicionarRegistro', { userId, data, hora: horaFormatada, origem })

  // Buscar registros do dia para calcular tipo pela posição
  const registrosDia = await getRecordsByPeriodo(data, data)
  dbg(`Registros existentes no dia ${data}:`, registrosDia.length)

  const todos = [...registrosDia, { hora: horaFormatada }]
  const tipos = atribuirTipos(todos)
  const tipo = tipos[todos.length - 1]

  const record: WorkRecord = {
    id: uuid(),
    user_id: userId,
    data,
    hora: horaFormatada,
    tipo,
    origem,
    criado_at: new Date().toISOString(),
    sincronizado: false,
  }

  dbg('Record criado:', record)

  // 1. Salvar local SEMPRE (offline-first)
  await saveRecordLocal(record)
  dbg('Salvo localmente (IndexedDB)')

  // 2. Tentar sincronizar com Supabase
  if (navigator.onLine) {
    try {
      const payload = {
        id: record.id,
        user_id: record.user_id,
        data: record.data,
        hora: record.hora,
        tipo: record.tipo,
        origem: record.origem,
        criado_at: record.criado_at,
      }
      dbg('Enviando para Supabase:', payload)

      const { error } = await supabase.from('work_records').insert(payload)

      if (!error) {
        await markRecordSynced(record.id)
        record.sincronizado = true
        dbg('Sincronizado com Supabase ✓')
      } else {
        dbg('Erro Supabase:', error.code, error.message)
        // Enfileirar para retry posterior
        await enqueuePendingSync({
          id: uuid(),
          tipo: 'insert',
          tabela: 'work_records',
          payload: record as unknown as Record<string, unknown>,
        })
      }
    } catch (err) {
      dbg('Exceção ao sincronizar:', err)
      await enqueuePendingSync({
        id: uuid(),
        tipo: 'insert',
        tabela: 'work_records',
        payload: record as unknown as Record<string, unknown>,
      })
    }
  } else {
    dbg('Offline — enfileirado para sync')
    await enqueuePendingSync({
      id: uuid(),
      tipo: 'insert',
      tabela: 'work_records',
      payload: record as unknown as Record<string, unknown>,
    })
  }

  return record
}

// ─── Buscar registros por período ─────────────────────────────────────────────

export async function getRegistrosPeriodo(
  userId: string,
  inicio: string,
  fim: string
): Promise<WorkRecord[]> {
  dbg('getRegistrosPeriodo', { userId, inicio, fim })

  if (navigator.onLine) {
    try {
      const serverRecords = await pullRecordsFromServer(userId, inicio, fim)
      dbg('Registros do servidor:', serverRecords.length)
      await upsertRecordsLocal(serverRecords)
      return serverRecords
    } catch (err) {
      dbg('Falha ao buscar do servidor, usando local:', err)
    }
  }

  const localRecords = await getRecordsByPeriodo(inicio, fim)
  dbg('Registros locais:', localRecords.length)
  return localRecords
}

// ─── Excluir registro ─────────────────────────────────────────────────────────

export async function excluirRegistro(userId: string, id: string): Promise<void> {
  dbg('excluirRegistro', id)
  await deleteRecordLocal(id)

  if (navigator.onLine) {
    try {
      const { error } = await supabase
        .from('work_records')
        .delete()
        .eq('id', id)
        .eq('user_id', userId)

      if (error) {
        dbg('Erro ao excluir no Supabase:', error.message)
        await enqueuePendingSync({
          id: uuid(),
          tipo: 'delete',
          tabela: 'work_records',
          payload: { id, user_id: userId },
        })
      }
    } catch {
      await enqueuePendingSync({
        id: uuid(),
        tipo: 'delete',
        tabela: 'work_records',
        payload: { id, user_id: userId },
      })
    }
  } else {
    await enqueuePendingSync({
      id: uuid(),
      tipo: 'delete',
      tabela: 'work_records',
      payload: { id, user_id: userId },
    })
  }
}

// ─── Salvar hora extra ────────────────────────────────────────────────────────

export async function salvarHoraExtra(
  userId: string,
  registro: Omit<import('@/types').OvertimeRecord, 'id' | 'user_id' | 'criado_at'>
): Promise<void> {
  const payload = {
    id: uuid(),
    user_id: userId,
    ...registro,
    horario_inicio: horaParaTime(registro.horario_inicio),
    horario_termino: horaParaTime(registro.horario_termino),
    criado_at: new Date().toISOString(),
  }

  dbg('salvarHoraExtra', payload)

  if (navigator.onLine) {
    const { error } = await supabase.from('overtime_records').insert(payload)
    if (error) throw new Error(error.message)
  } else {
    await enqueuePendingSync({
      id: uuid(),
      tipo: 'insert',
      tabela: 'overtime_records',
      payload,
    })
  }
}

// ─── Buscar horas extras ──────────────────────────────────────────────────────

export async function getHorasExtras(
  userId: string,
  inicio: string,
  fim: string
): Promise<import('@/types').OvertimeRecord[]> {
  if (!navigator.onLine) return []

  const { data, error } = await supabase
    .from('overtime_records')
    .select('*')
    .eq('user_id', userId)
    .gte('data', inicio)
    .lte('data', fim)
    .order('data', { ascending: true })

  if (error) return []
  return (data ?? []) as import('@/types').OvertimeRecord[]
}
