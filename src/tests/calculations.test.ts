/**
 * Testes unitários — cálculos de ponto com tolerância de ±5min
 * Executar: npx vitest run
 */

import { describe, it, expect } from 'vitest'
import {
  calcularResumoDiario,
  atribuirTipos,
  _JORNADA,
} from '@/features/work-records/calculations'
import type { WorkRecord } from '@/types'

function r(hora: string, idx = 0): WorkRecord {
  return {
    id: `t${idx}`,
    user_id: 'u',
    data: '2026-06-04',
    hora,
    tipo: 'entrada_manha',
    origem: 'manual',
    criado_at: '',
    sincronizado: true,
  }
}

// ─── atribuirTipos ────────────────────────────────────────────────────────────

describe('atribuirTipos', () => {
  it('4 marcações → ordem correta', () => {
    const tipos = atribuirTipos([
      { hora: '08:00' }, { hora: '12:00' },
      { hora: '14:00' }, { hora: '18:00' },
    ])
    expect(tipos).toEqual([
      'entrada_manha', 'saida_manha',
      'entrada_tarde', 'saida_tarde',
    ])
  })
})

// ─── Tolerância de entrada ────────────────────────────────────────────────────

describe('Tolerância de entrada (08:00 ±5min)', () => {
  it('07:55 → dentro da tolerância, sem anomalia', () => {
    const r1 = calcularResumoDiario([r('07:55', 1), r('18:00', 2)])
    expect(r1.banco_horas).toBe(0)
    expect(r1.hora_extra).toBe(0)
  })

  it('08:00 → normal', () => {
    const r1 = calcularResumoDiario([r('08:00', 1), r('18:00', 2)])
    expect(r1.banco_horas).toBe(0)
    expect(r1.hora_extra).toBe(0)
  })

  it('08:05 → dentro da tolerância', () => {
    const r1 = calcularResumoDiario([r('08:05', 1), r('18:00', 2)])
    expect(r1.banco_horas).toBe(0)
    expect(r1.hora_extra).toBe(0)
  })
})

// ─── Tolerância de saída ──────────────────────────────────────────────────────

describe('Tolerância de saída (18:00 ±5min)', () => {
  it('17:55 → dentro da tolerância, sem banco', () => {
    const r1 = calcularResumoDiario([r('08:00', 1), r('17:55', 2)])
    expect(r1.banco_horas).toBe(0)
    expect(r1.hora_extra).toBe(0)
  })

  it('18:05 → dentro da tolerância, sem banco', () => {
    const r1 = calcularResumoDiario([r('08:00', 1), r('18:05', 2)])
    expect(r1.banco_horas).toBe(0)
    expect(r1.hora_extra).toBe(0)
  })

  it('18:06 → 1 min de banco', () => {
    const r1 = calcularResumoDiario([r('08:00', 1), r('18:06', 2)])
    expect(r1.banco_horas).toBe(1)
    expect(r1.hora_extra).toBe(0)
  })

  it('19:05 → 60 min de banco', () => {
    const r1 = calcularResumoDiario([r('08:00', 1), r('19:05', 2)])
    expect(r1.banco_horas).toBe(60)
    expect(r1.hora_extra).toBe(0)
  })
})

// ─── Banco de horas ───────────────────────────────────────────────────────────

describe('Banco de horas (18:06 – 20:05)', () => {
  it('saída 20:05 → banco = 120min, extra = 0', () => {
    const r1 = calcularResumoDiario([r('08:00', 1), r('20:05', 2)])
    expect(r1.banco_horas).toBe(120)
    expect(r1.hora_extra).toBe(0)
  })

  it('banco máximo é 120min', () => {
    // Saída qualquer além de 20:05 — banco não cresce além de 120
    const r1 = calcularResumoDiario([r('08:00', 1), r('21:00', 2)])
    expect(r1.banco_horas).toBe(120)
  })
})

// ─── Hora extra ───────────────────────────────────────────────────────────────

describe('Hora extra (após 20:05)', () => {
  it('saída 20:06 → banco = 120min, extra = 1min', () => {
    const r1 = calcularResumoDiario([r('08:00', 1), r('20:06', 2)])
    expect(r1.banco_horas).toBe(120)
    expect(r1.hora_extra).toBe(1)
  })

  it('saída 20:45 → banco = 120min, extra = 40min', () => {
    const r1 = calcularResumoDiario([r('08:00', 1), r('20:45', 2)])
    expect(r1.banco_horas).toBe(120)
    expect(r1.hora_extra).toBe(40)
  })

  it('saída 21:05 → banco = 120min, extra = 60min', () => {
    const r1 = calcularResumoDiario([r('08:00', 1), r('21:05', 2)])
    expect(r1.banco_horas).toBe(120)
    expect(r1.hora_extra).toBe(60)
  })
})

// ─── Intrajornada ─────────────────────────────────────────────────────────────

describe('Intrajornada (12:00 – 14:00 = hora extra)', () => {
  it('marcações 08:00→12:15 e 13:20→18:00 → 55min de intrajornada', () => {
    // Par1: 08:00→12:15 — sobreposição com [12:00-14:00] = 15min
    // Par2: 13:20→18:00 — sobreposição com [12:00-14:00] = 40min
    // Total intrajornada = 55min
    const r1 = calcularResumoDiario([
      r('08:00', 1), r('12:15', 2),
      r('13:20', 3), r('18:00', 4),
    ])
    expect(r1.intrajornada).toBe(55)
    expect(r1.hora_extra).toBe(55)
  })

  it('sem marcação no intervalo → intrajornada = 0', () => {
    const r1 = calcularResumoDiario([
      r('08:00', 1), r('12:00', 2),
      r('14:00', 3), r('18:00', 4),
    ])
    expect(r1.intrajornada).toBe(0)
    expect(r1.hora_extra).toBe(0)
  })
})

// ─── Status do dia ────────────────────────────────────────────────────────────

describe('Status do dia', () => {
  it('0 marcações → ausente', () => {
    const r1 = calcularResumoDiario([])
    expect(r1.status).toBe('ausente')
  })

  it('1 marcação → incompleto', () => {
    const r1 = calcularResumoDiario([r('08:00', 1)])
    expect(r1.status).toBe('incompleto')
  })

  it('2 marcações normais → incompleto (sem banco/extra)', () => {
    const r1 = calcularResumoDiario([r('08:00', 1), r('18:00', 2)])
    expect(r1.status).toBe('incompleto')
  })

  it('4 marcações → completo', () => {
    const r1 = calcularResumoDiario([
      r('08:00', 1), r('12:00', 2),
      r('14:00', 3), r('18:00', 4),
    ])
    expect(r1.status).toBe('completo')
  })

  it('2 marcações com banco → completo', () => {
    const r1 = calcularResumoDiario([r('08:00', 1), r('19:00', 2)])
    expect(r1.status).toBe('completo')
  })
})

// ─── Constantes exportadas ────────────────────────────────────────────────────

describe('Constantes de tolerância', () => {
  it('INICIO_BANCO = 1085 (18:05)', () => {
    expect(_JORNADA.INICIO_BANCO).toBe(1085)
  })

  it('INICIO_EXTRA = 1205 (20:05)', () => {
    expect(_JORNADA.INICIO_EXTRA).toBe(1205)
  })

  it('ENTRADA_MIN = 475 (07:55)', () => {
    expect(_JORNADA.ENTRADA_MIN).toBe(475)
  })

  it('ENTRADA_MAX = 485 (08:05)', () => {
    expect(_JORNADA.ENTRADA_MAX).toBe(485)
  })

  it('SAIDA_NORMAL_MIN = 1075 (17:55)', () => {
    expect(_JORNADA.SAIDA_NORMAL_MIN).toBe(1075)
  })

  it('SAIDA_NORMAL_MAX = 1085 (18:05)', () => {
    expect(_JORNADA.SAIDA_NORMAL_MAX).toBe(1085)
  })
})
