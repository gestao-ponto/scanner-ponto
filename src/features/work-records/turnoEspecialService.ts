import { v4 as uuid } from 'uuid'
import { supabase } from '@/services/supabase/client'
import {
  saveTurnoEspecialLocal,
  removeTurnoEspecialLocal,
  getTurnoEspecialPorPeriodo,
  getTurnoEspecialIdLocal,
  upsertTurnoEspecialLocal,
  enqueuePendingSync,
} from '@/services/supabase/localDb'

// ─── Marcar um dia como turno especial (jornada padrão não se aplica) ────────

export async function marcarTurnoEspecial(userId: string, data: string): Promise<void> {
  const id = uuid()
  await saveTurnoEspecialLocal(data, id)

  if (navigator.onLine) {
    try {
      const { error } = await supabase
        .from('special_shift_days')
        .insert({ id, user_id: userId, data })
      if (error) throw error
    } catch {
      await enqueuePendingSync({
        id: uuid(),
        tipo: 'insert',
        tabela: 'special_shift_days',
        payload: { id, user_id: userId, data },
      })
    }
  } else {
    await enqueuePendingSync({
      id: uuid(),
      tipo: 'insert',
      tabela: 'special_shift_days',
      payload: { id, user_id: userId, data },
    })
  }
}

// ─── Desmarcar turno especial de um dia ───────────────────────────────────────

export async function desmarcarTurnoEspecial(userId: string, data: string): Promise<void> {
  // Guarda o id local antes de apagar — a fila de retry (processSyncQueue)
  // deleta por id, não por (user_id, data).
  const idLocal = await getTurnoEspecialIdLocal(data)
  await removeTurnoEspecialLocal(data)

  const enfileirarRetry = () =>
    enqueuePendingSync({
      id: uuid(),
      tipo: 'delete',
      tabela: 'special_shift_days',
      payload: { id: idLocal, user_id: userId, data },
    })

  if (navigator.onLine) {
    try {
      const { error } = await supabase
        .from('special_shift_days')
        .delete()
        .eq('user_id', userId)
        .eq('data', data)
      if (error) throw error
    } catch {
      await enfileirarRetry()
    }
  } else {
    await enfileirarRetry()
  }
}

// ─── Buscar dias de turno especial do período ─────────────────────────────────

export async function getTurnoEspecialPeriodo(
  userId: string,
  inicio: string,
  fim: string
): Promise<Set<string>> {
  if (navigator.onLine) {
    try {
      const { data, error } = await supabase
        .from('special_shift_days')
        .select('id, data')
        .eq('user_id', userId)
        .gte('data', inicio)
        .lte('data', fim)

      if (!error && data) {
        await upsertTurnoEspecialLocal(data as { data: string; id: string }[])
        return new Set(data.map((d) => d.data as string))
      }
    } catch {
      // cai pro cache local
    }
  }

  const locais = await getTurnoEspecialPorPeriodo(inicio, fim)
  return new Set(locais)
}
