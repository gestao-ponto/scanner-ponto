// ─── Perfil do colaborador ───────────────────────────────────────────────────
export interface Profile {
  id: string
  user_id: string
  nome: string
  matricula: string
  funcao: string
  lotacao: string
  centro_custo: string
  responsavel: string
  created_at: string
  updated_at: string
  lgpd_aceite: boolean
  lgpd_aceite_at: string | null
}

// ─── Registro de ponto bruto ─────────────────────────────────────────────────
export interface WorkRecord {
  id: string
  user_id: string
  data: string        // YYYY-MM-DD
  hora: string        // HH:mm
  tipo: TipoMarcacao
  origem: OrigemMarcacao
  criado_at: string
  sincronizado: boolean
  pendente_sync?: boolean // apenas local (IndexedDB)
}

export type TipoMarcacao =
  | 'entrada_manha'
  | 'saida_manha'
  | 'entrada_tarde'
  | 'saida_tarde'
  | 'entrada_noite'
  | 'saida_noite'

export type OrigemMarcacao = 'ocr' | 'upload' | 'manual'

// ─── Resumo diário calculado ─────────────────────────────────────────────────
export interface DailySummary {
  id: string
  user_id: string
  data: string
  horas_trabalhadas: number   // em minutos
  banco_horas: number         // em minutos
  hora_extra: number          // em minutos
  intrajornada: number        // em minutos trabalhados no intervalo
  status: StatusDia
  marcacoes: WorkRecord[]
}

export type StatusDia = 'completo' | 'incompleto' | 'ausente' | 'feriado' | 'fim_semana'

// ─── Registro de hora extra ──────────────────────────────────────────────────
export interface OvertimeRecord {
  id: string
  user_id: string
  data: string
  intrajornada: boolean
  horario_inicio: string      // HH:mm
  horario_termino: string     // HH:mm
  banco_horas: number         // minutos
  hora_extra_50: number       // minutos
  hora_extra_100: number      // minutos
  justificativa: string
  criado_at: string
}

// ─── Fechamento de período ───────────────────────────────────────────────────
export interface PeriodClosure {
  id: string
  user_id: string
  periodo_inicio: string      // YYYY-MM-DD
  periodo_fim: string         // YYYY-MM-DD
  total_horas: number
  total_banco: number
  total_extra: number
  fechado_em: string
  docx_gerado: boolean
  xlsx_gerado: boolean
}

// ─── Resultado OCR ───────────────────────────────────────────────────────────
export interface OcrResult {
  data: string | null         // DD/MM/YYYY
  hora: string | null         // HH:mm
  confianca: number           // 0-100
  texto_bruto: string
  sucesso: boolean
}

// ─── Estado offline/sync ─────────────────────────────────────────────────────
export interface PendingSync {
  id: string
  tipo: 'insert' | 'update' | 'delete'
  tabela: string
  payload: Record<string, unknown>
  tentativas: number
  criado_at: string
}

// ─── Período operacional ─────────────────────────────────────────────────────
export interface Periodo {
  inicio: Date   // dia 20 do mês anterior
  fim: Date      // dia 19 do mês atual
  label: string  // "20/04/2026 a 19/05/2026"
}

// ─── Dashboard stats ─────────────────────────────────────────────────────────
export interface DashboardStats {
  horas_trabalhadas: number
  banco_horas: number
  horas_extras: number
  dias_pendentes: number
  dias_completos: number
  periodo: Periodo
}
