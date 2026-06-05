import { format, parse, isWeekend, eachDayOfInterval } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Periodo } from '@/types'

// ─── Período operacional (20 do mês anterior → 19 do mês atual) ───────────────

export function getPeriodoAtual(): Periodo {
  const hoje = new Date()
  const anoAtual = hoje.getFullYear()
  const mesAtual = hoje.getMonth() // 0-indexed

  // Se hoje é antes do dia 20, o período ainda é do mês anterior
  const dia = hoje.getDate()
  let inicio: Date
  let fim: Date

  if (dia < 20) {
    // período: 20 do mês retrasado → 19 do mês anterior
    inicio = new Date(anoAtual, mesAtual - 1, 20)
    fim = new Date(anoAtual, mesAtual, 19)
  } else {
    // período: 20 do mês atual → 19 do próximo mês
    inicio = new Date(anoAtual, mesAtual, 20)
    fim = new Date(anoAtual, mesAtual + 1, 19)
  }

  return {
    inicio,
    fim,
    label: `${format(inicio, 'dd/MM/yyyy')} a ${format(fim, 'dd/MM/yyyy')}`,
  }
}

export function getPeriodoPorMes(ano: number, mes: number): Periodo {
  const inicio = new Date(ano, mes - 1, 20)
  const fim = new Date(ano, mes, 19)
  return {
    inicio,
    fim,
    label: `${format(inicio, 'dd/MM/yyyy')} a ${format(fim, 'dd/MM/yyyy')}`,
  }
}

export function periodoReadyToClose(periodo: Periodo): boolean {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const fim = new Date(periodo.fim)
  fim.setHours(0, 0, 0, 0)
  return hoje >= fim
}

// ─── Dias úteis no período ────────────────────────────────────────────────────

export function getDiasUteisNoPeriodo(periodo: Periodo): Date[] {
  const dias = eachDayOfInterval({ start: periodo.inicio, end: periodo.fim })
  return dias.filter((d) => !isWeekend(d))
}

// ─── Conversões de hora ───────────────────────────────────────────────────────

// Re-exportar de timeUtils para compatibilidade
export { horaParaMinutos, minutosParaHora, minutosParaLabel } from './timeUtils'

// ─── Formatação ───────────────────────────────────────────────────────────────

export function formatDataBR(isoDate: string): string {
  return format(parse(isoDate, 'yyyy-MM-dd', new Date()), 'dd/MM/yyyy')
}

export function formatDataLonga(isoDate: string): string {
  return format(parse(isoDate, 'yyyy-MM-dd', new Date()), "EEEE, dd 'de' MMMM", { locale: ptBR })
}

export function parseDataBR(dataBR: string): string {
  // "01/06/2026" → "2026-06-01"
  const [d, m, y] = dataBR.split('/')
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
}

export function dataISOParaDate(iso: string): Date {
  return parse(iso, 'yyyy-MM-dd', new Date())
}

export function getMesLabel(periodo: Periodo): string {
  return format(periodo.fim, 'MMMM yyyy', { locale: ptBR })
}

// ─── Fuso horário ─────────────────────────────────────────────────────────────

/** Retorna a data local no formato YYYY-MM-DD sem conversão UTC */
export function getDataLocal(): string {
  const d = new Date()
  return format(d, 'yyyy-MM-dd')
}
