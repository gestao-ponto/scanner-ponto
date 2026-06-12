import { useMemo } from 'react'
import { Clock, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react'
import { useRecords } from '@/features/work-records/useRecords'
import { useAuthStore, useUIStore } from '@/store'
import { calcularTotaisPeriodo } from '@/features/work-records/calculations'
import { minutosParaLabel, periodoReadyToClose, getDiasUteisNoPeriodo } from '@/utils/dateUtils'
import { ScanLine, FileDown, CalendarDays, List } from 'lucide-react'

export function Dashboard() {
  const { summaries, periodo, diasPendentes } = useRecords()
  const { profile } = useAuthStore()
  const { setNavigateTo } = useUIStore()

  const totais        = useMemo(() => calcularTotaisPeriodo(summaries), [summaries])
  const diasUteis     = useMemo(() => getDiasUteisNoPeriodo(periodo).length, [periodo])
  const diasCompletos = summaries.filter((s) => s.status === 'completo').length
  const progresso     = diasUteis > 0 ? (diasCompletos / diasUteis) * 100 : 0
  const prontoParaFechar = periodoReadyToClose(periodo)

  const primeiroNome = profile?.nome?.split(' ')[0] ?? 'Colaborador'
  const hora = new Date().getHours()
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'

  return (
    <div className="p-4 space-y-3">

      {prontoParaFechar && (
        <div className="rounded-2xl p-3 flex items-start gap-3"
          style={{ background: 'var(--badge-yellow-bg)', border: '1px solid var(--badge-yellow-text)33' }}>
          <AlertCircle size={16} style={{ color: 'var(--badge-yellow-text)', marginTop: 1 }} className="shrink-0" />
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--badge-yellow-text)' }}>
              Período pronto para fechamento
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{periodo.label}</p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{saudacao},</p>
          <p className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>{primeiroNome}</p>
        </div>
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold"
          style={{ background: '#2563eb22', border: '1.5px solid #2563eb55', color: '#2563eb' }}>
          {primeiroNome[0]}
        </div>
      </div>

      <div className="rounded-xl px-3 py-2.5 flex items-center justify-between"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Período atual</span>
        <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{periodo.label}</span>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <StatCard icon={<Clock size={16} color="#3b82f6" />}      label="Trabalhadas"  value={minutosParaLabel(totais.horasTrabalhadas)} sub="neste período" />
        <StatCard icon={<TrendingUp size={16} color="#f59e0b" />}  label="Banco"        value={minutosParaLabel(totais.bancoHoras)}        sub="acumulado" />
        <StatCard icon={<AlertCircle size={16} color="#ef4444" />} label="Extras"       value={minutosParaLabel(totais.horasExtras)}       sub="este período" />
        <StatCard
          icon={<CheckCircle size={16} color="#22c55e" />}
          label="Completos"
          value={`${diasCompletos}`}
          sub={`de ${diasUteis} dias`}
          badge={diasPendentes.length > 0 ? `${diasPendentes.length} pendente${diasPendentes.length > 1 ? 's' : ''}` : undefined}
        />
      </div>

      <div className="card">
        <div className="flex justify-between items-center mb-2">
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Progresso do período</p>
          <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
            {diasCompletos}/{diasUteis} dias
          </p>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progresso}%`, background: '#2563eb' }} />
        </div>
        <div className="flex gap-1 mt-2">
          {Array.from({ length: Math.min(diasUteis, 12) }, (_, i) => {
            const tipo = i < diasCompletos ? 'done' : i === diasCompletos ? 'current' : 'empty'
            return (
              <div key={i} className="flex-1 h-0.5 rounded-full"
                style={{
                  background: tipo === 'done' ? '#2563eb' : tipo === 'current' ? '#f59e0b' : 'var(--border)'
                }} />
            )
          })}
        </div>
      </div>

      <div>
        <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Ações rápidas</p>
        <div className="grid grid-cols-2 gap-2.5">
          <QuickAction icon={<ScanLine size={16} color="#2563eb" />}                    label="Escanear comprovante" accent onClick={() => setNavigateTo('scanner')} />
          <QuickAction icon={<FileDown size={16} color="var(--text-muted)" />}          label="Exportar cartão"      onClick={() => setNavigateTo('exportar')} />
          <QuickAction icon={<CalendarDays size={16} color="var(--text-muted)" />}      label="Ver calendário"       onClick={() => setNavigateTo('calendario')} />
          <QuickAction icon={<List size={16} color="var(--text-muted)" />}              label="Registros"            onClick={() => setNavigateTo('registros')} />
        </div>
      </div>

    </div>
  )
}

function StatCard({ icon, label, value, sub, badge }: {
  icon: React.ReactNode
  label: string
  value: string
  sub: string
  badge?: string
}) {
  return (
    <div className="rounded-2xl p-3" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
      <div className="flex items-center gap-1.5 mb-1.5">
        {icon}
        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{label}</span>
      </div>
      <p className="text-xl font-semibold leading-none" style={{ color: 'var(--text-primary)' }}>{value}</p>
      <p className="text-[10px] mt-1" style={{ color: 'var(--text-faint)' }}>{sub}</p>
      {badge && (
        <span className="inline-block mt-1.5 text-[10px] px-1.5 py-0.5 rounded-full"
          style={{ background: 'var(--badge-red-bg)', color: 'var(--badge-red-text)' }}>
          {badge}
        </span>
      )}
    </div>
  )
}

function QuickAction({ icon, label, accent, onClick }: {
  icon: React.ReactNode
  label: string
  accent?: boolean
  onClick?: () => void
}) {
  return (
    <div className="rounded-2xl p-3 flex flex-col gap-2 cursor-pointer transition-opacity active:opacity-70"
      onClick={onClick}
      style={{
        background: accent ? 'var(--accent-bg)' : 'var(--bg-surface)',
        border: `1px solid ${accent ? 'var(--accent-border)' : 'var(--border)'}`,
      }}>
      <div className="w-7 h-7 rounded-lg flex items-center justify-center"
        style={{ background: accent ? '#2563eb22' : 'var(--bg-overlay)' }}>
        {icon}
      </div>
      <span className="text-xs leading-tight"
        style={{ color: accent ? '#2563eb' : 'var(--text-secondary)' }}>
        {label}
      </span>
    </div>
  )
}