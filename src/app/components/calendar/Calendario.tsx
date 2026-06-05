import { useState, useMemo } from 'react'
import { format, eachDayOfInterval, getDay, isWeekend, isSameDay, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
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

  // Offset para alinhar a grade
  const primeiroOffset = getDay(periodo.inicio)

  function statusDia(isoData: string, dia: Date): string {
    if (isWeekend(dia)) return 'fds'
    const s = summaryMap.get(isoData)
    if (!s) return 'ausente'
    if (s.hora_extra > 0 || s.banco_horas > 0) return 'extra'
    return s.status
  }

  const corStatus: Record<string, string> = {
    fds: 'bg-slate-700/50 text-slate-500',
    ausente: 'bg-red-900/60 text-red-300 border border-red-700',
    incompleto: 'bg-yellow-900/60 text-yellow-300 border border-yellow-700',
    completo: 'bg-green-900/60 text-green-300 border border-green-700',
    extra: 'bg-blue-900/60 text-blue-300 border border-blue-700',
  }

  const summarioDia = diaSelecionado ? summaryMap.get(diaSelecionado) : null

  return (
    <div className="p-4">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-lg capitalize">
          {format(periodo.fim, 'MMMM yyyy', { locale: ptBR })}
        </h2>
        <div className="flex gap-2 text-xs">
          {[
            { cor: 'bg-green-500', label: 'OK' },
            { cor: 'bg-yellow-500', label: 'Incompleto' },
            { cor: 'bg-red-500', label: 'Ausente' },
            { cor: 'bg-blue-500', label: 'Extra' },
          ].map(({ cor, label }) => (
            <div key={label} className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${cor}`} />
              <span className="text-slate-400">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Grade dos dias da semana */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DIAS_SEMANA.map((d) => (
          <div key={d} className="text-center text-xs text-slate-500 py-1 font-medium">
            {d}
          </div>
        ))}
      </div>

      {/* Grade dos dias */}
      <div className="grid grid-cols-7 gap-1">
        {/* Células vazias de offset */}
        {Array.from({ length: primeiroOffset }, (_, i) => (
          <div key={`offset-${i}`} />
        ))}

        {dias.map((dia) => {
          const isoData = format(dia, 'yyyy-MM-dd')
          const status = statusDia(isoData, dia)
          const isSelected = diaSelecionado === isoData
          const summary = summaryMap.get(isoData)

          return (
            <button
              key={isoData}
              onClick={() => setDiaSelecionado(isSelected ? null : isoData)}
              className={`relative aspect-square rounded-lg text-sm font-medium transition-all
                ${corStatus[status]}
                ${isSelected ? 'ring-2 ring-white scale-95' : 'hover:opacity-80'}
                ${status === 'fds' ? 'cursor-default' : 'cursor-pointer'}
              `}
            >
              {format(dia, 'd')}
              {/* Indicador de extra */}
              {summary && (summary.hora_extra > 0) && (
                <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-orange-400 rounded-full" />
              )}
            </button>
          )
        })}
      </div>

      {/* Detalhe do dia selecionado */}
      {diaSelecionado && (
        <div className="mt-4 card relative">
          <button
            onClick={() => setDiaSelecionado(null)}
            className="absolute top-3 right-3 text-slate-400 hover:text-white"
          >
            <X size={16} />
          </button>

          <p className="font-semibold text-sm capitalize mb-3">
            {formatDataLonga(diaSelecionado)}
          </p>

          {summarioDia ? (
            <div className="space-y-2">
              {summarioDia.marcacoes.map((m) => (
                <div key={m.id} className="flex items-center justify-between bg-slate-700/50 rounded-lg px-3 py-2">
                  <div>
                    <span className="text-base font-mono font-semibold">{m.hora}</span>
                    <span className="text-xs text-slate-400 ml-2">{labelTipo(m.tipo)}</span>
                  </div>
                  <span className="badge-gray">{m.origem}</span>
                </div>
              ))}

              {(summarioDia.banco_horas > 0 || summarioDia.hora_extra > 0) && (
                <div className="mt-2 pt-2 border-t border-slate-700 flex gap-4 text-xs">
                  {summarioDia.banco_horas > 0 && (
                    <span className="text-amber-400">Banco: {minutosParaLabel(summarioDia.banco_horas)}</span>
                  )}
                  {summarioDia.hora_extra > 0 && (
                    <span className="text-red-400">Extra: {minutosParaLabel(summarioDia.hora_extra)}</span>
                  )}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-400">Nenhuma marcação registrada</p>
          )}
        </div>
      )}
    </div>
  )
}

function labelTipo(tipo: string): string {
  const mapa: Record<string, string> = {
    entrada_manha: 'Entrada manhã',
    saida_manha: 'Saída manhã',
    entrada_tarde: 'Entrada tarde',
    saida_tarde: 'Saída tarde',
    entrada_noite: 'Entrada noite',
    saida_noite: 'Saída noite',
  }
  return mapa[tipo] ?? tipo
}
