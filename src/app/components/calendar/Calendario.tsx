import { useState, useMemo } from 'react'
import { format, eachDayOfInterval, getDay, isWeekend } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { X } from 'lucide-react'
import { useRecords } from '@/features/work-records/useRecords'
import type { DailySummary } from '@/types'
import { formatDataLonga, minutosParaLabel } from '@/utils/dateUtils'

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export function Calendario() {
  const { summaries, periodo } = useRecords()
  const [diaSelecionado, setDiaSelecionado] = useState<string | null>(null)

  const summaryMap = useMemo(() => {
    const map = new Map<string, DailySummary>()
    summaries.forEach((s) => map.set(s.data, s))
    return map
  }, [summaries])

  const dias = useMemo(() =>
    eachDayOfInterval({ start: periodo.inicio, end: periodo.fim }),
    [periodo]
  )

  const primeiroOffset = getDay(periodo.inicio)

  function statusDia(isoData: string, dia: Date) {
    if (isWeekend(dia)) return 'fds'
    const s = summaryMap.get(isoData)
    if (!s) return 'ausente'
    if (s.hora_extra > 0 || s.banco_horas > 0) return 'extra'
    return s.status
  }

  const corStatus: Record<string, { bg: string; text: string; border: string }> = {
    fds:       { bg: 'var(--cal-fds)',              text: 'var(--cal-fds-text)',          border: 'transparent' },
    ausente:   { bg: 'var(--badge-red-bg)',          text: 'var(--badge-red-text)',        border: 'var(--badge-red-text)33' },
    incompleto:{ bg: 'var(--badge-yellow-bg)',       text: 'var(--badge-yellow-text)',     border: 'var(--badge-yellow-text)33' },
    completo:  { bg: 'var(--badge-green-bg)',        text: 'var(--badge-green-text)',      border: 'var(--badge-green-text)33' },
    extra:     { bg: 'var(--badge-blue-bg)',         text: 'var(--badge-blue-text)',       border: 'var(--badge-blue-text)33' },
  }

  const summarioDia = diaSelecionado ? summaryMap.get(diaSelecionado) : null

  return (
    <div className="p-4">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-base capitalize" style={{ color: 'var(--text-primary)' }}>
          {format(periodo.fim, 'MMMM yyyy', { locale: ptBR })}
        </h2>
        <div className="flex gap-3 text-xs">
          {[
            { cor: 'var(--badge-green-text)',  label: 'OK' },
            { cor: 'var(--badge-yellow-text)', label: 'Incompleto' },
            { cor: 'var(--badge-red-text)',    label: 'Ausente' },
            { cor: 'var(--badge-blue-text)',   label: 'Extra' },
          ].map(({ cor, label }) => (
            <div key={label} className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{ background: cor }} />
              <span style={{ color: 'var(--text-muted)' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Dias da semana */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DIAS_SEMANA.map((d) => (
          <div key={d} className="text-center text-xs py-1 font-medium"
            style={{ color: 'var(--text-faint)' }}>{d}</div>
        ))}
      </div>

      {/* Grade */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: primeiroOffset }, (_, i) => <div key={`offset-${i}`} />)}

        {dias.map((dia) => {
          const isoData = format(dia, 'yyyy-MM-dd')
          const status  = statusDia(isoData, dia)
          const isSelected = diaSelecionado === isoData
          const cor = corStatus[status]

          return (
            <button key={isoData}
              onClick={() => setDiaSelecionado(isSelected ? null : isoData)}
              className="relative aspect-square rounded-xl text-sm font-medium transition-all"
              style={{
                background: cor.bg,
                color: cor.text,
                border: `1px solid ${isSelected ? 'var(--text-primary)' : cor.border}`,
                outline: isSelected ? '2px solid var(--text-primary)' : 'none',
                outlineOffset: '1px',
                cursor: status === 'fds' ? 'default' : 'pointer',
              }}>
              {format(dia, 'd')}
            </button>
          )
        })}
      </div>

      {/* Detalhe */}
      {diaSelecionado && (
        <div className="mt-4 card relative">
          <button onClick={() => setDiaSelecionado(null)}
            className="absolute top-3 right-3 transition-colors"
            style={{ color: 'var(--text-muted)' }}>
            <X size={16} />
          </button>

          <p className="font-semibold text-sm capitalize mb-3" style={{ color: 'var(--text-primary)' }}>
            {formatDataLonga(diaSelecionado)}
          </p>

          {summarioDia ? (
            <div className="space-y-2">
              {summarioDia.marcacoes.map((m) => (
                <div key={m.id} className="flex items-center justify-between rounded-xl px-3 py-2"
                  style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border)' }}>
                  <div>
                    <span className="text-base font-mono font-semibold"
                      style={{ color: 'var(--text-primary)' }}>
                      {m.hora.slice(0, 5)}
                    </span>
                    <span className="text-xs ml-2" style={{ color: 'var(--text-muted)' }}>
                      {labelTipo(m.tipo)}
                    </span>
                  </div>
                  <span className="badge-gray">{m.origem}</span>
                </div>
              ))}

              {(summarioDia.banco_horas > 0 || summarioDia.hora_extra > 0) && (
                <div className="mt-2 pt-2 flex gap-4 text-xs"
                  style={{ borderTop: '1px solid var(--border)' }}>
                  {summarioDia.banco_horas > 0 && (
                    <span style={{ color: 'var(--badge-yellow-text)' }}>
                      Banco: {minutosParaLabel(summarioDia.banco_horas)}
                    </span>
                  )}
                  {summarioDia.hora_extra > 0 && (
                    <span style={{ color: 'var(--badge-red-text)' }}>
                      Extra: {minutosParaLabel(summarioDia.hora_extra)}
                    </span>
                  )}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Nenhuma marcação registrada
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function labelTipo(tipo: string): string {
  const mapa: Record<string, string> = {
    entrada_manha: 'Entrada manhã',
    saida_manha:   'Saída manhã',
    entrada_tarde: 'Entrada tarde',
    saida_tarde:   'Saída tarde',
    entrada_noite: 'Entrada noite',
    saida_noite:   'Saída noite',
  }
  return mapa[tipo] ?? tipo
}
