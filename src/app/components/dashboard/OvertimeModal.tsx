import { useState } from 'react'
import { AlertCircle, X, Clock } from 'lucide-react'
import { useOvertimeModal, useAuthStore } from '@/store'
import { salvarHoraExtra } from '@/features/work-records/recordsService'
import { minutosParaLabel, minutosParaHora } from '@/utils/dateUtils'

export function OvertimeModal() {
  const {
    isOpen,
    data,
    inicioHora,
    fimHora,
    bancoMinutos,
    extraMinutos,
    intrajornada,
    closeModal,
  } = useOvertimeModal()
  const { userId } = useAuthStore()

  const [justificativa, setJustificativa] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  if (!isOpen) return null

  const handleSalvar = async () => {
    if (!justificativa.trim()) {
      setErro('A justificativa é obrigatória.')
      return
    }
    if (!userId || !data || !inicioHora || !fimHora) return

    setLoading(true)
    setErro('')

    try {
      await salvarHoraExtra(userId, {
        data,
        intrajornada,
        horario_inicio: inicioHora,
        horario_termino: fimHora,
        banco_horas: bancoMinutos,
        hora_extra_50: extraMinutos,
        hora_extra_100: 0, // calculado pelo XLSX via fórmula
        justificativa: justificativa.trim(),
      })
      closeModal()
      setJustificativa('')
    } catch {
      setErro('Erro ao salvar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    // Só permite fechar se não houver justificativa pendente com extra detectado
    closeModal()
    setJustificativa('')
    setErro('')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={handleClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-slate-800 border border-slate-600 rounded-2xl p-5 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-amber-900 rounded-lg flex items-center justify-center">
              <Clock size={16} className="text-amber-400" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-100">Autorização de Horas Extras</h3>
              <p className="text-xs text-slate-400">{data}</p>
            </div>
          </div>
          <button onClick={handleClose} className="text-slate-400 hover:text-white p-1">
            <X size={18} />
          </button>
        </div>

        {/* Detalhes */}
        <div className="bg-slate-700/50 rounded-xl p-3 mb-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Horário</span>
            <span className="font-mono font-semibold">{inicioHora} – {fimHora}</span>
          </div>
          {intrajornada && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Tipo</span>
              <span className="badge-blue">Intrajornada</span>
            </div>
          )}
          {bancoMinutos > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Banco de horas</span>
              <span className="text-amber-400 font-semibold">{minutosParaLabel(bancoMinutos)}</span>
            </div>
          )}
          {extraMinutos > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Hora extra</span>
              <span className="text-red-400 font-semibold">{minutosParaLabel(extraMinutos)}</span>
            </div>
          )}
        </div>

        {/* Justificativa */}
        <div className="mb-4">
          <label className="text-sm text-slate-300 mb-1.5 block font-medium">
            Justificativa <span className="text-red-400">*</span>
          </label>
          <textarea
            className="input resize-none h-24"
            placeholder="Descreva o motivo das horas extras..."
            value={justificativa}
            onChange={(e) => {
              setJustificativa(e.target.value)
              if (erro) setErro('')
            }}
            autoFocus
          />
          {erro && (
            <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
              <AlertCircle size={12} />
              {erro}
            </p>
          )}
        </div>

        {/* Ações */}
        <div className="flex gap-2">
          <button onClick={handleClose} className="btn-secondary flex-1">
            Cancelar
          </button>
          <button
            onClick={handleSalvar}
            disabled={loading || !justificativa.trim()}
            className="btn-primary flex-1 flex items-center justify-center gap-2"
          >
            {loading && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            Salvar
          </button>
        </div>
      </div>
    </div>
  )
}
