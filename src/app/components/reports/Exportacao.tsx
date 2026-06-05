import { useState } from 'react'
import { FileText, Table, Download, CheckCircle, AlertCircle } from 'lucide-react'
import { useRecords } from '@/features/work-records/useRecords'
import { useAuthStore } from '@/store'
import { gerarCartaoPonto } from '@/services/export/exportDocx'
import { gerarAutorizacaoHorasExtras } from '@/services/export/exportXlsx'
import { getHorasExtras } from '@/features/work-records/recordsService'
import { periodoReadyToClose } from '@/utils/dateUtils'
import { format } from 'date-fns'

export function Exportacao() {
  const { records, summaries, periodo } = useRecords()
  const { profile } = useAuthStore()

  const [loadingDocx, setLoadingDocx] = useState(false)
  const [loadingXlsx, setLoadingXlsx] = useState(false)
  const [statusDocx, setStatusDocx] = useState<'idle' | 'ok' | 'error'>('idle')
  const [statusXlsx, setStatusXlsx] = useState<'idle' | 'ok' | 'error'>('idle')
  const [erroMsg, setErroMsg] = useState('')

  const prontoParaFechar = periodoReadyToClose(periodo)

  const handleGerarDocx = async () => {
    if (!profile) return
    setLoadingDocx(true)
    setStatusDocx('idle')
    try {
      await gerarCartaoPonto(records, profile, periodo)
      setStatusDocx('ok')
    } catch (e) {
      setStatusDocx('error')
      setErroMsg(String(e))
    } finally {
      setLoadingDocx(false)
    }
  }

  const handleGerarXlsx = async () => {
    if (!profile) return
    setLoadingXlsx(true)
    setStatusXlsx('idle')
    try {
      const inicio = format(periodo.inicio, 'yyyy-MM-dd')
      const fim = format(periodo.fim, 'yyyy-MM-dd')
      const registros = await getHorasExtras(profile.user_id, inicio, fim)

      if (registros.length === 0) {
        setStatusXlsx('error')
        setErroMsg('Nenhuma hora extra registrada no período.')
        return
      }

      await gerarAutorizacaoHorasExtras(registros, profile, periodo.label)
      setStatusXlsx('ok')
    } catch (e) {
      setStatusXlsx('error')
      setErroMsg(String(e))
    } finally {
      setLoadingXlsx(false)
    }
  }

  const totalExtra = summaries.reduce((acc, s) => acc + s.hora_extra, 0)
  const totalBanco = summaries.reduce((acc, s) => acc + s.banco_horas, 0)

  return (
    <div className="p-4 space-y-4">
      {/* Status do período */}
      <div className={`card ${prontoParaFechar ? 'border-amber-600' : ''}`}>
        <p className="text-sm text-slate-400 mb-1">Período</p>
        <p className="font-semibold">{periodo.label}</p>
        {prontoParaFechar && (
          <p className="text-xs text-amber-400 mt-1 flex items-center gap-1">
            <AlertCircle size={12} />
            Pronto para fechamento
          </p>
        )}
      </div>

      {/* Resumo do período */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card text-center">
          <p className="text-2xl font-bold text-amber-400">{Math.floor(totalBanco / 60)}h{totalBanco % 60}m</p>
          <p className="text-xs text-slate-400 mt-0.5">Banco de horas</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-red-400">{Math.floor(totalExtra / 60)}h{totalExtra % 60}m</p>
          <p className="text-xs text-slate-400 mt-0.5">Horas extras</p>
        </div>
      </div>

      {/* Exportar Cartão de Ponto */}
      <div className="card">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 bg-blue-900 rounded-xl flex items-center justify-center shrink-0">
            <FileText size={20} className="text-blue-400" />
          </div>
          <div>
            <h3 className="font-semibold">Cartão de Ponto</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Gera o documento DOCX com todas as marcações do período
            </p>
          </div>
        </div>

        {statusDocx === 'ok' && (
          <p className="text-xs text-green-400 flex items-center gap-1 mb-2">
            <CheckCircle size={12} /> Documento gerado com sucesso!
          </p>
        )}
        {statusDocx === 'error' && (
          <p className="text-xs text-red-400 mb-2">{erroMsg}</p>
        )}

        <button
          onClick={handleGerarDocx}
          disabled={loadingDocx || !profile || records.length === 0}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          {loadingDocx ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Download size={16} />
          )}
          Gerar Cartão de Ponto (.docx)
        </button>
      </div>

      {/* Exportar Autorização de Horas Extras */}
      <div className="card">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 bg-green-900 rounded-xl flex items-center justify-center shrink-0">
            <Table size={20} className="text-green-400" />
          </div>
          <div>
            <h3 className="font-semibold">Autorização de Horas Extras</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Gera a planilha XLSX preenchida com banco de horas e horas extras
            </p>
          </div>
        </div>

        {totalExtra === 0 && totalBanco === 0 && (
          <p className="text-xs text-slate-500 mb-2">
            Nenhuma hora extra ou banco registrado no período atual.
          </p>
        )}

        {statusXlsx === 'ok' && (
          <p className="text-xs text-green-400 flex items-center gap-1 mb-2">
            <CheckCircle size={12} /> Planilha gerada com sucesso!
          </p>
        )}
        {statusXlsx === 'error' && (
          <p className="text-xs text-red-400 mb-2">{erroMsg}</p>
        )}

        <button
          onClick={handleGerarXlsx}
          disabled={loadingXlsx || !profile}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          {loadingXlsx ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Download size={16} />
          )}
          Gerar Autorização Horas Extras (.xlsx)
        </button>
      </div>

      {!profile && (
        <p className="text-xs text-center text-slate-500">
          Complete seu perfil para habilitar as exportações.
        </p>
      )}
    </div>
  )
}
