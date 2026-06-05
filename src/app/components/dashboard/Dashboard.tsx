import { useMemo } from 'react'
import { Clock, TrendingUp, Calendar, AlertCircle, CheckCircle } from 'lucide-react'
import { useRecords } from '@/features/work-records/useRecords'
import { calcularTotaisPeriodo } from '@/features/work-records/calculations'
import { minutosParaLabel, periodoReadyToClose, getDiasUteisNoPeriodo } from '@/utils/dateUtils'
import { isWeekend } from 'date-fns'

export function Dashboard() {
  const { records, summaries, periodo, diasPendentes } = useRecords()

  const totais = useMemo(() => calcularTotaisPeriodo(summaries), [summaries])

  const diasUteis = useMemo(() => getDiasUteisNoPeriodo(periodo).length, [periodo])

  const diasCompletos = summaries.filter((s) => s.status === 'completo').length

  const prontoParaFechar = periodoReadyToClose(periodo)

  return (
    <div className="p-4 space-y-4">
      {/* Alerta de fechamento */}
      {prontoParaFechar && (
        <div className="bg-amber-900/50 border border-amber-600 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle size={18} className="text-amber-400 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-amber-300 text-sm">Período pronto para fechamento</p>
            <p className="text-xs text-amber-400 mt-0.5">{periodo.label}</p>
          </div>
        </div>
      )}

      {/* Período */}
      <div className="card">
        <p className="text-xs text-slate-400 mb-1">Período atual</p>
        <p className="font-semibold text-slate-100">{periodo.label}</p>
      </div>

      {/* Cards de stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={<Clock size={20} className="text-blue-400" />}
          label="Horas trabalhadas"
          value={minutosParaLabel(totais.horasTrabalhadas)}
          color="blue"
        />
        <StatCard
          icon={<TrendingUp size={20} className="text-amber-400" />}
          label="Banco de horas"
          value={minutosParaLabel(totais.bancoHoras)}
          color="amber"
        />
        <StatCard
          icon={<AlertCircle size={20} className="text-red-400" />}
          label="Horas extras"
          value={minutosParaLabel(totais.horasExtras)}
          color="red"
        />
        <StatCard
          icon={<Calendar size={20} className="text-slate-400" />}
          label="Dias pendentes"
          value={String(diasPendentes.length)}
          color={diasPendentes.length > 0 ? 'red' : 'green'}
        />
        <StatCard
          icon={<CheckCircle size={20} className="text-green-400" />}
          label="Dias completos"
          value={`${diasCompletos}/${diasUteis}`}
          color="green"
        />
        <StatCard
          icon={<Clock size={20} className="text-purple-400" />}
          label="Intrajornada"
          value={minutosParaLabel(totais.intrajornada)}
          color="purple"
        />
      </div>

      {/* Progresso do período */}
      <div className="card">
        <div className="flex justify-between items-center mb-2">
          <p className="text-sm text-slate-400">Progresso do período</p>
          <p className="text-sm font-semibold text-slate-200">
            {diasCompletos}/{diasUteis} dias
          </p>
        </div>
        <div className="h-2.5 bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-red-600 to-red-400 rounded-full transition-all duration-500"
            style={{ width: `${diasUteis > 0 ? (diasCompletos / diasUteis) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Distribuição por status */}
      {summaries.length > 0 && (
        <div className="card">
          <p className="text-sm text-slate-400 mb-3">Distribuição dos dias</p>
          <div className="space-y-2">
            {[
              { status: 'completo', label: 'Completo', color: 'bg-green-500' },
              { status: 'incompleto', label: 'Incompleto', color: 'bg-yellow-500' },
              { status: 'ausente', label: 'Ausente', color: 'bg-red-500' },
            ].map(({ status, label, color }) => {
              const count = summaries.filter((s) => s.status === status).length
              const pct = diasUteis > 0 ? (count / diasUteis) * 100 : 0
              return (
                <div key={status} className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${color} shrink-0`} />
                  <span className="text-xs text-slate-400 w-20">{label}</span>
                  <div className="flex-1 h-1.5 bg-slate-700 rounded-full">
                    <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-slate-400 w-6 text-right">{count}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode
  label: string
  value: string
  color: 'blue' | 'amber' | 'red' | 'green' | 'purple'
}) {
  const bg: Record<string, string> = {
    blue: 'from-blue-950 to-slate-800',
    amber: 'from-amber-950 to-slate-800',
    red: 'from-red-950 to-slate-800',
    green: 'from-green-950 to-slate-800',
    purple: 'from-purple-950 to-slate-800',
  }

  return (
    <div className={`bg-gradient-to-br ${bg[color]} border border-slate-700 rounded-2xl p-3`}>
      <div className="flex items-center gap-2 mb-1.5">
        {icon}
        <span className="text-xs text-slate-400">{label}</span>
      </div>
      <p className="text-xl font-bold text-slate-100">{value}</p>
    </div>
  )
}
