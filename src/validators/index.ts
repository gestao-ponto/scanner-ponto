// ─── Validação de data BR ─────────────────────────────────────────────────────
export function isDataBRValida(dataBR: string): boolean {
  const regex = /^(\d{2})\/(\d{2})\/(\d{4})$/
  const match = dataBR.match(regex)
  if (!match) return false
  const d = Number(match[1]), m = Number(match[2]), y = Number(match[3])
  return d >= 1 && d <= 31 && m >= 1 && m <= 12 && y >= 2020 && y <= 2099
}

// ─── Validação de hora ────────────────────────────────────────────────────────
export function isHoraValida(hora: string): boolean {
  const regex = /^(\d{1,2}):(\d{2})(:\d{2})?$/
  const match = hora.match(regex)
  if (!match) return false
  const h = Number(match[1]), m = Number(match[2])
  return h >= 0 && h <= 23 && m >= 0 && m <= 59
}

// ─── Validação de justificativa ───────────────────────────────────────────────
export function isJustificativaValida(texto: string): boolean {
  return texto.trim().length >= 5
}

// ─── Validação de perfil ──────────────────────────────────────────────────────
export function isPerfilValido(perfil: {
  nome: string
  matricula: string
  funcao: string
}): boolean {
  return perfil.nome.trim().length > 0 &&
         perfil.matricula.trim().length > 0 &&
         perfil.funcao.trim().length > 0
}
