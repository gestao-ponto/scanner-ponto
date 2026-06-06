import { describe, it, expect } from 'vitest'
import { normalizarData, normalizarHora } from '@/features/ocr/dateTimeParser'

describe('normalizarData', () => {
  it('data válida com âncora DATA:', () => {
    expect(normalizarData('DATA: 01/06/2026')).toBe('01/06/2026')
  })

  it('data com espaços entre componentes (quebra de impressão térmica)', () => {
    expect(normalizarData('DATA: 01/0 6/2026')).toBe('01/06/2026')
    expect(normalizarData('DATA: 01 /06/2026')).toBe('01/06/2026')
    expect(normalizarData('DATA: 01/06 /2026')).toBe('01/06/2026')
  })

  it('data sem âncora DATA: — extrai DD/MM/YYYY do texto livre', () => {
    expect(normalizarData('Comprovante\n20/05/2026\n18:07')).toBe('20/05/2026')
  })

  it('data com OCR confundindo O com 0 no ano', () => {
    expect(normalizarData('DATA: 01/06/2O26')).toBe('01/06/2026')
  })

  it('data com dígitos colados após DATA:', () => {
    expect(normalizarData('DATA:01062026')).toBe('01/06/2026')
  })

  it('retorna null para texto sem data', () => {
    expect(normalizarData('HORA: 08:00')).toBeNull()
    expect(normalizarData('')).toBeNull()
    expect(normalizarData('lorem ipsum')).toBeNull()
  })

  it('rejeita dia inválido', () => {
    expect(normalizarData('DATA: 32/06/2026')).toBeNull()
  })

  it('rejeita mês inválido', () => {
    expect(normalizarData('DATA: 01/13/2026')).toBeNull()
  })

  it('rejeita ano fora do intervalo (< 2020)', () => {
    expect(normalizarData('DATA: 01/06/2019')).toBeNull()
  })
})

describe('normalizarHora', () => {
  it('hora válida com âncora HORA:', () => {
    expect(normalizarHora('HORA: 08:00')).toBe('08:00')
    expect(normalizarHora('HORA: 18:07')).toBe('18:07')
  })

  it('hora com ponto em vez de dois-pontos (papel térmico)', () => {
    expect(normalizarHora('HORA: 08.00')).toBe('08:00')
  })

  it('hora sem âncora — extrai HH:MM do texto livre', () => {
    expect(normalizarHora('01/06/2026 12:01')).toBe('12:01')
  })

  it('hora com zero à esquerda ausente', () => {
    expect(normalizarHora('HORA: 8:05')).toBe('08:05')
  })

  it('retorna null para texto sem hora', () => {
    expect(normalizarHora('DATA: 01/06/2026')).toBeNull()
    expect(normalizarHora('')).toBeNull()
  })

  it('rejeita hora inválida (h > 23)', () => {
    expect(normalizarHora('24:00')).toBeNull()
  })

  it('rejeita minutos inválidos (min > 59)', () => {
    expect(normalizarHora('10:60')).toBeNull()
  })
})

describe('Texto real de comprovante', () => {
  it('extrai data e hora de texto típico', () => {
    const texto = 'SENAI\nDATA: 01/06/2026\nHORA: 12:01\nFIM'
    expect(normalizarData(texto)).toBe('01/06/2026')
    expect(normalizarHora(texto)).toBe('12:01')
  })

  it('extrai apenas data quando hora está ausente', () => {
    const texto = 'DATA: 20/05/2026'
    expect(normalizarData(texto)).toBe('20/05/2026')
    expect(normalizarHora(texto)).toBeNull()
  })

  it('extrai apenas hora quando data está ausente', () => {
    const texto = 'HORA: 18:07'
    expect(normalizarData(texto)).toBeNull()
    expect(normalizarHora(texto)).toBe('18:07')
  })

  it('texto vazio retorna null em ambos', () => {
    expect(normalizarData('')).toBeNull()
    expect(normalizarHora('')).toBeNull()
  })

  it('texto sem data nem hora retorna null em ambos', () => {
    const texto = 'IDENTIFICACAO DO COLABORADOR\nNOME: JOAO SILVA'
    expect(normalizarData(texto)).toBeNull()
    expect(normalizarHora(texto)).toBeNull()
  })

  it('múltiplas imagens — parser é stateless (sem efeito entre chamadas)', () => {
    const t1 = 'DATA: 01/06/2026\nHORA: 08:00'
    const t2 = 'DATA: 02/06/2026\nHORA: 12:30'
    const t3 = 'DATA: 03/06/2026\nHORA: 18:07'
    expect(normalizarData(t1)).toBe('01/06/2026')
    expect(normalizarData(t2)).toBe('02/06/2026')
    expect(normalizarData(t3)).toBe('03/06/2026')
    expect(normalizarHora(t1)).toBe('08:00')
    expect(normalizarHora(t2)).toBe('12:30')
    expect(normalizarHora(t3)).toBe('18:07')
  })
})