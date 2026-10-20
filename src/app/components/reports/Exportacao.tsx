import { useState, useEffect } from 'react'
import { FileText, Table, Download, CheckCircle, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import { useRecords } from '@/features/work-records/useRecords'
import { useAuthStore } from '@/store'
import { gerarCartaoPonto } from '@/services/export/exportDocx'
import { gerarAutorizacaoHorasExtras } from '@/services/export/exportXlsx'
import { getHorasExtras } from '@/features/work-records/recordsService'
import { periodoReadyToClose, periodoAnterior, periodoSeguinte, getPeriodoAtual } from '@/utils/dateUtils'
import { mensagemErroAmigavel } from '@/utils/errorMessages'
import { format } from 'date-fns'

export function Exportacao() {
  const { records, summaries, periodo, setPeriodo } = useRecords()
  const { profile } = useAuthStore()

  // useRecords já recarrega os registros automaticamente quando `periodo` muda
  // (efeito interno dependente de `periodo`) — só precisamos atualizar o período.
  const periodoAtualLabel = getPeriodoAtual().label
  const noPeriodoAtual = periodo.label === periodoAtualLabel

  const irParaPeriodoAnterior = () => setPeriodo(periodoAnterior(periodo))
  const irParaPeriodoSeguinte = () => setPeriodo(periodoSeguinte(periodo))

  // Ao sair desta tela, volta o período global pro atual — evita que Dashboard,
  // Scanner e Calendário fiquem mostrando um período passado sem o usuário notar.
  useEffect(() => {
    return () => setPeriodo(getPeriodoAtual())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [loadingDocx, setLoadingDocx] = useState(false)
  const [loadingXlsx, setLoadingXlsx] = useState(false)
  const [statusDocx, setStatusDocx] = useState<'idle'|'ok'|'error'>('idle')
  const [statusXlsx, setStatusXlsx] = useState<'idle'|'ok'|'error'>('idle')
  const [erroMsg, setErroMsg] = useState('')

  const prontoParaFechar = periodoReadyToClose(periodo)

  const totalExtra = summaries.reduce((acc, s) => acc + s.hora_extra, 0)
  const totalBanco = summaries.reduce((acc, s) => acc + s.banco_horas, 0)
  const diasRegistrados = summaries.filter(s => s.marcacoes.length > 0).length

  const handleGerarDocx = async () => {
    if (!profile) return
    setLoadingDocx(true); setStatusDocx('idle')
    try {
      await gerarCartaoPonto(records, profile, periodo)
      setStatusDocx('ok')
    } catch (e) {
      console.error('[Exportacao] Erro ao gerar cartão de ponto:', e)
      setStatusDocx('error'); setErroMsg(await mensagemErroAmigavel(e))
    } finally { setLoadingDocx(false) }
  }

  const handleGerarXlsx = async () => {
    if (!profile) return
    setLoadingXlsx(true); setStatusXlsx('idle')
    try {
      const inicio = format(periodo.inicio, 'yyyy-MM-dd')
      const fim    = format(periodo.fim, 'yyyy-MM-dd')
      const registros = await getHorasExtras(profile.user_id, inicio, fim)
      if (registros.length === 0) {
        setStatusXlsx('error')
        setErroMsg('Nenhuma hora extra registrada no período.')
        return
      }
      await gerarAutorizacaoHorasExtras(registros, profile, periodo.label)
      setStatusXlsx('ok')
    } catch (e) {
      console.error('[Exportacao] Erro ao gerar autorização de horas extras:', e)
      setStatusXlsx('error'); setErroMsg(await mensagemErroAmigavel(e))
    } finally { setLoadingXlsx(false) }
  }

  return (
    <div className="p-4 space-y-3">

      {/* Período */}
      <div className="card" style={{ borderColor: prontoParaFechar ? 'var(--badge-yellow-text)55' : undefined }}>
        <div className="flex items-center justify-between gap-2">
          <button onClick={irParaPeriodoAnterior} aria-label="Período anterior"
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: 'var(--bg-surface-2, rgba(255,255,255,0.06))' }}>
            <ChevronLeft size={16} style={{ color: 'var(--text-secondary)' }} />
          </button>

          <div className="text-center">
            <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>Período</p>
            <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{periodo.label}</p>
          </div>

          <button onClick={irParaPeriodoSeguinte} aria-label="Próximo período"
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: 'var(--bg-surface-2, rgba(255,255,255,0.06))' }}>
            <ChevronRight size={16} style={{ color: 'var(--text-secondary)' }} />
          </button>
        </div>

        {!noPeriodoAtual && (
          <button onClick={() => setPeriodo(getPeriodoAtual())}
            className="text-xs w-full text-center mt-2" style={{ color: 'var(--badge-blue-text)' }}>
            Voltar para o período atual
          </button>
        )}

        {prontoParaFechar && noPeriodoAtual && (
          <p className="text-xs mt-1.5 flex items-center gap-1 justify-center"
            style={{ color: 'var(--badge-yellow-text)' }}>
            <AlertCircle size={12} /> Pronto para fechamento
          </p>
        )}
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="card text-center">
          <p className="text-xl font-bold" style={{ color: 'var(--badge-yellow-text)' }}>
            {Math.floor(totalBanco / 60)}h{totalBanco % 60 > 0 ? `${totalBanco % 60}m` : ''}
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Banco de horas</p>
        </div>
        <div className="card text-center">
          <p className="text-xl font-bold" style={{ color: 'var(--badge-red-text)' }}>
            {Math.floor(totalExtra / 60)}h{totalExtra % 60 > 0 ? `${totalExtra % 60}m` : ''}
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Horas extras</p>
        </div>
      </div>

      {/* Cartão de Ponto */}
      <div className="card space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'var(--badge-blue-bg)' }}>
            <FileText size={20} style={{ color: 'var(--badge-blue-text)' }} />
          </div>
          <div>
            <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
              Cartão de Ponto
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Documento Word (.docx)
            </p>
          </div>
        </div>

        <div className="space-y-1.5 text-xs" style={{ borderTop: '1px solid var(--border)', paddingTop: 10 }}>
          <div className="flex justify-between">
            <span style={{ color: 'var(--text-muted)' }}>Período</span>
            <span style={{ color: 'var(--text-secondary)' }}>{periodo.label}</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: 'var(--text-muted)' }}>Colaborador</span>
            <span style={{ color: 'var(--text-secondary)' }}>{profile?.nome ?? '—'}</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: 'var(--text-muted)' }}>Dias registrados</span>
            <span style={{ color: 'var(--text-secondary)' }}>{diasRegistrados}</span>
          </div>
        </div>

        {statusDocx === 'ok' && (
          <p className="text-xs flex items-center gap-1" style={{ color: 'var(--badge-green-text)' }}>
            <CheckCircle size={12} /> Documento gerado com sucesso!
          </p>
        )}
        {statusDocx === 'error' && (
          <p className="text-xs" style={{ color: 'var(--badge-red-text)' }}>{erroMsg}</p>
        )}

        <button onClick={handleGerarDocx}
          disabled={loadingDocx || !profile || records.length === 0}
          className="btn-primary w-full flex items-center justify-center gap-2 text-sm">
          {loadingDocx
            ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : <Download size={16} />}
          Baixar Cartão de Ponto
        </button>
      </div>

      {/* Autorização Horas Extras */}
      <div className="card space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'var(--badge-green-bg)' }}>
            <Table size={20} style={{ color: 'var(--badge-green-text)' }} />
          </div>
          <div>
            <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
              Autorização de Horas Extras
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Planilha Excel (.xlsx)
            </p>
          </div>
        </div>

        <div className="space-y-1.5 text-xs" style={{ borderTop: '1px solid var(--border)', paddingTop: 10 }}>
          <div className="flex justify-between">
            <span style={{ color: 'var(--text-muted)' }}>Banco de horas</span>
            <span style={{ color: 'var(--badge-yellow-text)' }}>
              {Math.floor(totalBanco/60)}h{totalBanco%60>0?`${totalBanco%60}m`:''}
            </span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: 'var(--text-muted)' }}>Horas extras</span>
            <span style={{ color: 'var(--badge-red-text)' }}>
              {Math.floor(totalExtra/60)}h{totalExtra%60>0?`${totalExtra%60}m`:''}
            </span>
          </div>
        </div>

        {totalExtra === 0 && totalBanco === 0 && (
          <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
            Nenhuma hora extra ou banco registrado no período atual.
          </p>
        )}
        {statusXlsx === 'ok' && (
          <p className="text-xs flex items-center gap-1" style={{ color: 'var(--badge-green-text)' }}>
            <CheckCircle size={12} /> Planilha gerada com sucesso!
          </p>
        )}
        {statusXlsx === 'error' && (
          <p className="text-xs" style={{ color: 'var(--badge-red-text)' }}>{erroMsg}</p>
        )}

        <button onClick={handleGerarXlsx}
          disabled={loadingXlsx || !profile}
          className="btn-primary w-full flex items-center justify-center gap-2 text-sm">
          {loadingXlsx
            ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : <Download size={16} />}
          Baixar Autorização de Horas Extras
        </button>
      </div>

      {!profile && (
        <p className="text-xs text-center" style={{ color: 'var(--text-faint)' }}>
          Complete seu perfil para habilitar as exportações.
        </p>
      )}
    </div>
  )
}
