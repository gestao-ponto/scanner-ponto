/** "08:30" ou "08:30:00" → minutos desde meia-noite */
export function horaParaMinutos(hora: string): number {
  const [h, m] = hora.split(':').map(Number)
  return h * 60 + m
}

/** minutos → "08:30" */
export function minutosParaHora(minutos: number): string {
  if (minutos < 0) minutos = 0
  const h = Math.floor(minutos / 60)
  const m = minutos % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** minutos → "2h 30min" */
export function minutosParaLabel(minutos: number): string {
  if (minutos <= 0) return '0min'
  const h = Math.floor(minutos / 60)
  const m = minutos % 60
  if (h === 0) return `${m}min`
  if (m === 0) return `${h}h`
  return `${h}h ${m}min`
}
