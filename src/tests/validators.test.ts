import { describe, it, expect } from 'vitest'
import { isDataBRValida, isHoraValida, isJustificativaValida } from '@/validators'

describe('validators', () => {
  it('data válida', () => {
    expect(isDataBRValida('04/06/2026')).toBe(true)
    expect(isDataBRValida('31/12/2025')).toBe(true)
  })
  it('data inválida', () => {
    expect(isDataBRValida('2026-06-04')).toBe(false)
    expect(isDataBRValida('32/01/2026')).toBe(false)
    expect(isDataBRValida('')).toBe(false)
  })
  it('hora válida', () => {
    expect(isHoraValida('08:00')).toBe(true)
    expect(isHoraValida('23:59')).toBe(true)
    expect(isHoraValida('08:00:00')).toBe(true)
  })
  it('hora inválida', () => {
    expect(isHoraValida('24:00')).toBe(false)
    expect(isHoraValida('abc')).toBe(false)
  })
  it('justificativa válida', () => {
    expect(isJustificativaValida('Reunião emergencial')).toBe(true)
  })
  it('justificativa inválida', () => {
    expect(isJustificativaValida('ok')).toBe(false)
    expect(isJustificativaValida('')).toBe(false)
  })
})
