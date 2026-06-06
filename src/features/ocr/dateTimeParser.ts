/**
 * Parser dedicado para extração de DATA e HORA de texto OCR de papel térmico.
 * Módulo puro — sem imports externos, testável isoladamente.
 */

// ─── Correção de caracteres comuns em papel térmico ───────────────────────────

function corrigirOCR(texto: string): string {
  return texto
    .replace(/(\d{1,2})\.(\d{2})\b/g, '$1:$2')
    .replace(/\b(2)[O0o](\d{2})\b/g, '20$2')
    .replace(/\b[Z2]0([6-9]\d)\b/g, '20$1')
    .replace(/\b20([5-9]\d)\b/g, (m, d) => {
      const n = parseInt(d)
      if (n > 39) return `20${String(n - 50).padStart(2, '0')}`
      return m
    })
    .toUpperCase()
}

// ─── Parser de data ───────────────────────────────────────────────────────────

export function normalizarData(textoOriginal: string): string | null {
  const texto = corrigirOCR(textoOriginal)

  // Estratégia 1: DATA: DD/MM/YYYY com qualquer separador/espaço
  const m1 = texto.match(/DATA\s*:?\s*(\d{1,2})\s*[\/\-\s]\s*(\d{1,2})\s*[\/\-\s]\s*(\d{4})/)
  if (m1) {
    const d = m1[1].padStart(2, '0'), mo = m1[2].padStart(2, '0'), y = m1[3]
    if (+d >= 1 && +d <= 31 && +mo >= 1 && +mo <= 12 && +y >= 2020 && +y <= 2099)
      return `${d}/${mo}/${y}`
  }

  // Estratégia 2: extrai só dígitos após DATA: (resolve "04/0 6/2026")
  const m2 = texto.match(/DATA\s*:?\s*([\d\s\/\-]{5,16})/)
  if (m2) {
    const digits = m2[1].replace(/\D/g, '')
    if (digits.length >= 8) {
      const d = digits.slice(0, 2), mo = digits.slice(2, 4), y = digits.slice(4, 8)
      if (+d >= 1 && +d <= 31 && +mo >= 1 && +mo <= 12 && +y >= 2020 && +y <= 2099)
        return `${d}/${mo}/${y}`
    }
  }

  // Estratégia 3: DD/MM/YYYY em qualquer lugar do texto
  const m3 = texto.match(/\b(\d{2})\/(\d{2})\/(20\d{2})\b/)
  if