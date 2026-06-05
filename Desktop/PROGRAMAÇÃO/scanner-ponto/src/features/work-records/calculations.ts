import type { WorkRecord, DailySummary, TipoMarcacao } from '@/types'
import { horaParaMinutos } from '@/utils/timeUtils'

// ─── Jornada padrão (em minutos desde meia-noite) ─────────────────────────────
const ENTRADA        = horaParaMinutos('08:00')  // 480
const SAIDA_ALMOCO   = horaParaMinutos('12:00')  // 720
const RETORNO_ALMOCO = horaParaMinutos('14:00')  // 840
const SAIDA_NORMAL   = horaParaMinutos('18:00')  // 1080
const LIMITE_BANCO   = horaParaMinutos('20:00')  // 1200  após isso = hora extra

// ─── Tolerância: ±5 minutos em cada ponto da jornada ─────────────────────────
const TOL = 5

// Limites com tolerância aplicada
const ENTRADA_MIN        = ENTRADA        - TOL  // 07:55
const ENTRADA_MAX        = ENTRADA        + TOL  // 08:05
const SAIDA_ALMOCO_MIN   = SAIDA_ALMOCO   - TOL  // 11:55
const SAIDA_ALMOCO_MAX   = SAIDA_ALMOCO   + TOL  // 12:05
const RETORNO_ALMOCO_MIN = RETORNO_ALMOCO - TOL  // 13:55
const RETORNO_ALMOCO_MAX = RETORNO_ALMOCO + TOL  // 14:05
const SAIDA_NORMAL_MIN   = SAIDA_NORMAL   - TOL  // 17:55
const SAIDA_NORMAL_MAX   = SAIDA_NORMAL   + TOL  // 18:05

// Banco começa após 18:05 (fora da tolerância de saída)
const INICIO_BANCO = SAIDA_NORMAL_MAX  // 18:05
// Hora extra começa após 20:05 (tolerância no limite do banco)
const INICIO_EXTRA = LIMITE_BANCO + TOL  // 20:05

// ─── Mapeamento de marcação por posição ───────────────────────────────────────
const TIPOS_ORDEM: TipoMarcacao[] = [
  'entrada_manha',
  'saida_manha',
  'entrada_tarde',
  'saida_tarde',
  'entrada_noite',
  'saida_noite',
]

export function atribuirTipos(marcacoes: { hora: string }[]): TipoMarcacao[] {
  const ordenadas = [...marcacoes].sort((a, b) => a.hora.localeCompare(b.hora))
  return ordenadas.map((_, i) => TIPOS_ORDEM[i] ?? 'entrada_noite')
}

// ─── Verificar se marcação está dentro da tolerância de um ponto ──────────────
function dentroDaTolerancia(minutos: number, referencia: number): boolean {
  return minutos >= referencia - TOL && minutos <= referencia + TOL
}

// ─── Calcular banco de horas e hora extra para uma saída ─────────────────────
// Regra:
//   saída ≤ 18:05 → sem banco, sem extra
//   18:06 – 20:05 → banco (máx 2h)
//   > 20:05       → banco = 2h + hora extra pelo excedente
function calcularBancoExtra(saida: number): { banco: number; extra: number } {
  if (saida <= INICIO_BANCO) return { banco: 0, extra: 0 }

  const banco = Math.min(saida - INICIO_BANCO, INICIO_EXTRA - INICIO_BANCO)  // máx 120min
  const extra = Math.max(0, saida - INICIO_EXTRA)

  return { banco, extra }
}

// ─── Cálculo do resumo diário ─────────────────────────────────────────────────

export function calcularResumoDiario(records: WorkRecord[]): Omit<DailySummary, 'id' | 'user_id'> {
  const ordenados = [...records].sort((a, b) => a.hora.localeCompare(b.hora))
  const marcacoes = ordenados.map((r) => horaParaMinutos(r.hora))

  let horasTrabalhadas = 0
  let bancoHoras = 0
  let horaExtra = 0
  let intrajornada = 0

  if (marcacoes.length < 2) {
    return {
      data: records[0]?.data ?? '',
      horas_trabalhadas: 0,
      banco_horas: 0,
      hora_extra: 0,
      intrajornada: 0,
      status: marcacoes.length === 1 ? 'incompleto' : 'ausente',
      marcacoes: ordenados,
    }
  }

  // Calcular pares entrada/saída
  const pares: Array<[number, number]> = []
  for (let i = 0; i + 1 < marcacoes.length; i += 2) {
    pares.push([marcacoes[i], marcacoes[i + 1]])
  }

  for (const [entrada, saida] of pares) {
    const duracao = saida - entrada
    if (duracao <= 0) continue

    horasTrabalhadas += duracao

    // ── Intrajornada ──────────────────────────────────────────────────────────
    // Tempo trabalhado dentro do intervalo 12:00–14:00 = hora extra.
    //
    // Regra: calcular a sobreposição do par com [12:00, 14:00],
    // MAS apenas quando há mais de 2 marcações no dia (par de almoço explícito)
    // OU quando a entrada do par começa dentro do intervalo.
    //
    // Com apenas 2 marcações (08:00→18:00), o intervalo é considerado
    // como almoço já descontado — não gera intrajornada.
    // Com 4+ marcações, qualquer sobreposição real com [12:00,14:00] é intrajornada.
    const temMarcacaoAlmoco = marcacoes.length >= 4
    if (temMarcacaoAlmoco) {
      const inicioIntra = Math.max(entrada, SAIDA_ALMOCO)
      const fimIntra    = Math.min(saida,   RETORNO_ALMOCO)
      if (inicioIntra < fimIntra) {
        intrajornada += fimIntra - inicioIntra
      }
    }

    // ── Banco e hora extra ────────────────────────────────────────────────────
    const { banco, extra } = calcularBancoExtra(saida)
    bancoHoras += banco
    horaExtra  += extra
  }

  // Intrajornada também é hora extra
  horaExtra += intrajornada

  const temTodasMarcacoes     = marcacoes.length >= 4
  const temMarcacoesSuficientes = marcacoes.length >= 2
  const status = temTodasMarcacoes
    ? 'completo'
    : temMarcacoesSuficientes
    ? 'incompleto'
    : 'ausente'

  return {
    data: records[0]?.data ?? '',
    horas_trabalhadas: horasTrabalhadas,
    banco_horas: bancoHoras,
    hora_extra: horaExtra,
    intrajornada,
    status: (bancoHoras > 0 || horaExtra > 0) ? 'completo' : status,
    marcacoes: ordenados,
  }
}

// ─── Agrupamento de records por dia ──────────────────────────────────────────

export function agruparPorDia(records: WorkRecord[]): Map<string, WorkRecord[]> {
  const mapa = new Map<string, WorkRecord[]>()
  for (const r of records) {
    const lista = mapa.get(r.data) ?? []
    lista.push(r)
    mapa.set(r.data, lista)
  }
  return mapa
}

// ─── Totais do período ────────────────────────────────────────────────────────

export interface TotaisPeriodo {
  horasTrabalhadas: number
  bancoHoras: number
  horasExtras: number
  intrajornada: number
}

export function calcularTotaisPeriodo(
  summaries: Array<Omit<DailySummary, 'id' | 'user_id'>>
): TotaisPeriodo {
  return summaries.reduce(
    (acc, s) => ({
      horasTrabalhadas: acc.horasTrabalhadas + s.horas_trabalhadas,
      bancoHoras:       acc.bancoHoras       + s.banco_horas,
      horasExtras:      acc.horasExtras      + s.hora_extra,
      intrajornada:     acc.intrajornada     + s.intrajornada,
    }),
    { horasTrabalhadas: 0, bancoHoras: 0, horasExtras: 0, intrajornada: 0 }
  )
}

// ─── Detectar se dia precisa de autorização ───────────────────────────────────

export function precisaAutorizacao(
  summary: Omit<DailySummary, 'id' | 'user_id'>
): boolean {
  return summary.banco_horas > 0 || summary.hora_extra > 0
}

// ─── Calcular horário início/fim para autorização ─────────────────────────────

export function calcularHorarioAutorizacao(
  records: WorkRecord[]
): { inicio: string; fim: string } | null {
  if (records.length < 2) return null
  const ordenados = [...records].sort((a, b) => a.hora.localeCompare(b.hora))
  return {
    inicio: ordenados[0].hora,
    fim:    ordenados[ordenados.length - 1].hora,
  }
}

// ─── Exportar constantes para uso nos testes ─────────────────────────────────
export const _JORNADA = {
  ENTRADA_MIN, ENTRADA_MAX,
  SAIDA_ALMOCO_MIN, SAIDA_ALMOCO_MAX,
  RETORNO_ALMOCO_MIN, RETORNO_ALMOCO_MAX,
  SAIDA_NORMAL_MIN, SAIDA_NORMAL_MAX,
  INICIO_BANCO, INICIO_EXTRA,
}
