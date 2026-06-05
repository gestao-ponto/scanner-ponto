// ─── Jornada padrão ───────────────────────────────────────────────────────────
export const JORNADA = {
  ENTRADA: '08:00',
  SAIDA_ALMOCO: '12:00',
  RETORNO_ALMOCO: '14:00',
  SAIDA_NORMAL: '18:00',
  LIMITE_BANCO: '20:00',
} as const

// ─── Período operacional ──────────────────────────────────────────────────────
export const PERIODO = {
  DIA_INICIO: 20,  // dia 20 do mês anterior
  DIA_FIM: 19,     // dia 19 do mês atual
} as const

// ─── OCR ─────────────────────────────────────────────────────────────────────
export const OCR = {
  CONFIANCA_MINIMA: 60,
  LANG: 'eng',
} as const

// ─── Sync ─────────────────────────────────────────────────────────────────────
export const SYNC = {
  MAX_RETRIES: 5,
  DEBOUNCE_MS: 2000,
} as const

// ─── Storage keys ─────────────────────────────────────────────────────────────
export const STORAGE_KEYS = {
  CAMERA_ID: 'scanner_ponto_camera_id',
} as const
