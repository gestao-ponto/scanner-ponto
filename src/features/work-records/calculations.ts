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

// "Encaixa" um horário no ponto padrão mais próximo se estiver dentro da
// banda de ±5min dele — usado pra não cobrar déficit de alguém que bateu
// o ponto 1-5min antes/depois do horário certo (mesma tolerância aplicada
// em todo o resto do app). As quatro bandas não se sobrepõem entre si, então
// isso é seguro de aplicar em qualquer horário de entrada ou saída.
function encaixarNaTolerancia(minuto: number): number {
  if (minuto >= ENTRADA_MIN        && minuto <= ENTRADA_MAX)        return ENTRADA
  if (minuto >= SAIDA_ALMOCO_MIN   && minuto <= SAIDA_ALMOCO_MAX)   return SAIDA_ALMOCO
  if (minuto >= RETORNO_ALMOCO_MIN && minuto <= RETORNO_ALMOCO_MAX) return RETORNO_ALMOCO
  if (minuto >= SAIDA_NORMAL_MIN   && minuto <= SAIDA_NORMAL_MAX)   return SAIDA_NORMAL
  return minuto
}

// ─── Mapeamento de marcação por posição (fallback) ────────────────────────────
const TIPOS_ORDEM: TipoMarcacao[] = [
  'entrada_manha',
  'saida_manha',
  'entrada_tarde',
  'saida_tarde',
  'entrada_noite',
  'saida_noite',
]

// ─── Classificar tipo pelo horário ────────────────────────────────────────────
//
// Cada horário pertence a uma "zona" definida pelas janelas de tolerância.
// Dentro da zona, a alternância entrada/saída usa a paridade do índice ordinal.
//
// Zonas:
//   07:55–08:05  → entrada_manha  (janela de entrada)
//   08:06–11:54  → saida_manha    (período manhã — só pode estar saindo)
//   11:55–12:05  → saida_manha    (janela saída almoço)
//   13:55–14:05  → entrada_tarde  (janela retorno almoço)
//   14:06–17:54  → entrada_tarde / saida_tarde (por paridade)
//   17:55–18:05  → saida_tarde    (janela saída normal)
//   > 18:05      → entrada_noite / saida_noite (por paridade)
//   12:06–13:54  → fallback posicional (intervalo de almoço — horário incomum)
//
function classificarPorHorario(hora: string, posicao: number): TipoMarcacao {
  const min = horaParaMinutos(hora)

  if (min >= ENTRADA_MIN && min <= ENTRADA_MAX)           return 'entrada_manha'
  if (min > ENTRADA_MAX && min < SAIDA_ALMOCO_MIN)        return 'saida_manha'
  if (min >= SAIDA_ALMOCO_MIN && min <= SAIDA_ALMOCO_MAX) return 'saida_manha'
  if (min >= RETORNO_ALMOCO_MIN && min <= RETORNO_ALMOCO_MAX) return 'entrada_tarde'
  if (min > RETORNO_ALMOCO_MAX && min < SAIDA_NORMAL_MIN) return posicao % 2 === 0 ? 'entrada_tarde' : 'saida_tarde'
  if (min >= SAIDA_NORMAL_MIN && min <= SAIDA_NORMAL_MAX) return 'saida_tarde'
  if (min > SAIDA_NORMAL_MAX)                             return posicao % 2 === 0 ? 'entrada_noite' : 'saida_noite'

  // Zona ambígua: intervalo de almoço 12:06–13:54 → fallback posicional
  return TIPOS_ORDEM[posicao % TIPOS_ORDEM.length]
}

export function atribuirTipos(marcacoes: { hora: string }[]): TipoMarcacao[] {
  const comIndice = marcacoes.map((m, indiceOriginal) => ({ ...m, indiceOriginal }))
  const ordenadas = comIndice.sort((a, b) => a.hora.localeCompare(b.hora))

  const tiposPorIndiceOriginal: TipoMarcacao[] = new Array(marcacoes.length)
  ordenadas.forEach((m, i) => {
    tiposPorIndiceOriginal[m.indiceOriginal] = classificarPorHorario(m.hora, i)
  })

  return tiposPorIndiceOriginal
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

// ─── Horas a pagar (déficit dentro do expediente padrão) ──────────────────────
//
// Minutos do horário habitual (08:00-12:00 e 14:00-18:00 = 480min/dia) em
// que o usuário NÃO esteve presente: atraso, saída antecipada, ausência
// total. Independe de qual par é "manhã" ou "tarde" — soma a sobreposição
// de CADA par registrado com as duas janelas padrão, então funciona tanto
// pra dias com 4 marcações quanto pra dias com só 2 (08:00→18:00 direto).
function calcularHorasAPagarDoDia(marcacoes: number[], isDiaEspecial: boolean): number {
  if (isDiaEspecial) return 0

  const ESPERADO = (SAIDA_ALMOCO - ENTRADA) + (SAIDA_NORMAL - RETORNO_ALMOCO)  // 480min

  const pares: Array<[number, number]> = []
  for (let i = 0; i + 1 < marcacoes.length; i += 2) {
    pares.push([marcacoes[i], marcacoes[i + 1]])
  }

  let presente = 0
  for (const [entradaBruta, saidaBruta] of pares) {
    const entrada = encaixarNaTolerancia(entradaBruta)
    const saida   = encaixarNaTolerancia(saidaBruta)
    if (saida <= entrada) continue

    presente += Math.max(0, Math.min(saida, SAIDA_ALMOCO) - Math.max(entrada, ENTRADA))
    presente += Math.max(0, Math.min(saida, SAIDA_NORMAL) - Math.max(entrada, RETORNO_ALMOCO))
  }

  presente = Math.min(presente, ESPERADO)
  return Math.max(0, ESPERADO - presente)
}

// ─── Cálculo do resumo diário ─────────────────────────────────────────────────

// `isDiaEspecial`: quando true, a jornada padrão (SAIDA_NORMAL/LIMITE_BANCO)
// não se aplica — o dia tem um turno combinado diferente do usual, então
// nada é contado como banco/hora-extra/intrajornada. As horas trabalhadas
// continuam sendo somadas normalmente.
export function calcularResumoDiario(
  records: WorkRecord[],
  isDiaEspecial = false
): Omit<DailySummary, 'id' | 'user_id'> {
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
      horas_a_pagar: calcularHorasAPagarDoDia(marcacoes, isDiaEspecial),
      status: marcacoes.length === 1 ? 'incompleto' : 'ausente',
      marcacoes: ordenados,
      turno_especial: isDiaEspecial,
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
    // Tempo trabalhado dentro do intervalo de almoço = hora extra.
    //
    // Regra: calcular a sobreposição do par com a janela "núcleo" do almoço
    // ([12:05, 13:55] — SAIDA_ALMOCO_MAX a RETORNO_ALMOCO_MIN), não com
    // [12:00,14:00] cru. Sair até 12:05 ou voltar a partir de 13:55 já conta
    // como "dentro da tolerância" em todo o resto do app (classificação de
    // tipo usa a mesma banda de ±5min) — usar os limites crus aqui criava um
    // falso positivo: voltar do almoço 1 min mais cedo (ex. 13:59, dentro da
    // tolerância) gerava "1 minuto de intrajornada/hora extra" sem motivo.
    //
    // Com apenas 2 marcações (08:00→18:00), o intervalo é considerado
    // como almoço já descontado — não gera intrajornada.
    // Com 4+ marcações, sobreposição com a janela núcleo é intrajornada.
    const temMarcacaoAlmoco = marcacoes.length >= 4
    if (temMarcacaoAlmoco && !isDiaEspecial) {
      const inicioIntra = Math.max(entrada, SAIDA_ALMOCO_MAX)
      const fimIntra    = Math.min(saida,   RETORNO_ALMOCO_MIN)
      if (inicioIntra < fimIntra) {
        intrajornada += fimIntra - inicioIntra
      }
    }

    // ── Banco e hora extra ────────────────────────────────────────────────────
    if (!isDiaEspecial) {
      const { banco, extra } = calcularBancoExtra(saida)
      bancoHoras += banco
      horaExtra  += extra
    }
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
    horas_a_pagar: calcularHorasAPagarDoDia(marcacoes, isDiaEspecial),
    status: (bancoHoras > 0 || horaExtra > 0) ? 'completo' : status,
    marcacoes: ordenados,
    turno_especial: isDiaEspecial,
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
  horasAPagar: number
}

// Formato YYYY-MM-DD da data local de hoje — mesmo formato de WorkRecord.data
function hojeISO(): string {
  const hoje = new Date()
  const ano = hoje.getFullYear()
  const mes = String(hoje.getMonth() + 1).padStart(2, '0')
  const dia = String(hoje.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

export function calcularTotaisPeriodo(
  summaries: Array<Omit<DailySummary, 'id' | 'user_id'>>
): TotaisPeriodo {
  const hoje = hojeISO()

  return summaries.reduce(
    (acc, s) => ({
      horasTrabalhadas: acc.horasTrabalhadas + s.horas_trabalhadas,
      bancoHoras:       acc.bancoHoras       + s.banco_horas,
      horasExtras:      acc.horasExtras      + s.hora_extra,
      intrajornada:     acc.intrajornada     + s.intrajornada,
      // Só soma déficit de dias que já terminaram — um dia em andamento
      // (hoje) ainda não teve chance de completar o expediente.
      horasAPagar:      acc.horasAPagar      + (s.data < hoje ? s.horas_a_pagar : 0),
    }),
    { horasTrabalhadas: 0, bancoHoras: 0, horasExtras: 0, intrajornada: 0, horasAPagar: 0 }
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
