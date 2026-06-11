import { useState } from 'react'
import { LogOut, User, Shield, Trash2, Download, RefreshCw } from 'lucide-react'
import { useAuth } from '@/features/auth/useAuth'
import { useAuthStore } from '@/store'
import { supabase } from '@/services/supabase/client'
import { syncWorkRecords, processSyncQueue } from '@/features/work-records/syncService'
import { clearAllRecordsLocal } from '@/services/supabase/localDb'

export function Configuracoes() {
  const { signOut, profile } = useAuth()
  const { userId } = useAuthStore()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<string | null>(null)

  const handleSincronizar = async () => {
    if (syncing) return
    setSyncing(true)
    setSyncResult(null)
    try {
      await syncWorkRecords()
      const { synced, failed } = await processSyncQueue()
      if (synced > 0 && failed === 0) {
        setSyncResult(`✓ ${synced} registro${synced !== 1 ? 's' : ''} sincronizado${synced !== 1 ? 's' : ''} com sucesso.`)
      } else if (synced > 0 && failed > 0) {
        setSyncResult(`✓ ${synced} sincronizado${synced !== 1 ? 's' : ''}, ${failed} falhou.`)
      } else if (failed > 0) {
        setSyncResult(`Falha ao sincronizar ${failed} registro${failed !== 1 ? 's' : ''}.`)
      } else {
        setSyncResult('Registros já estavam sincronizado.')
      }
    } catch {
      setSyncResult('Erro ao tentar sincronizar. Tente novamente.')
    } finally {
      setSyncing(false)
    }
  }

  const handleExportarDados = async () => {
    if (!userId) return
    const { data } = await supabase.from('work_records').select('*').eq('user_id', userId)
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `dados_ponto_${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleExcluirHistorico = async () => {
    if (!userId || !confirmDelete) {
      setConfirmDelete(true)
      return
    }
    setLoading(true)
    try {
      await supabase.from('work_records').delete().eq('user_id', userId)
      await supabase.from('overtime_records').delete().eq('user_id', userId)
      await clearAllRecordsLocal()
      setMsg('Histórico excluído com sucesso.')
      setConfirmDelete(false)
    } finally {
      setLoading(false)
    }
  }

  const handleExcluirConta = async () => {
    if (!userId) return
    if (!window.confirm('Excluir sua conta permanentemente? Esta ação não pode ser desfeita.')) return
    setLoading(true)
    try {
      await supabase.from('profiles').delete().eq('user_id', userId)
      await supabase.from('work_records').delete().eq('user_id', userId)
      await supabase.from('overtime_records').delete().eq('user_id', userId)
      await signOut()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 space-y-4">
      {/* Perfil */}
      {profile && (
        <div className="card">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center">
              <User size={20} className="text-slate-300" />
            </div>
            <div>
              <p className="font-semibold text-slate-100">{profile.nome}</p>
              <p className="text-xs text-slate-400">Matrícula: {profile.matricula}</p>
            </div>
          </div>
          <div className="space-y-1 text-sm text-slate-400">
            <p><span className="text-slate-300">Função:</span> {profile.funcao}</p>
            <p><span className="text-slate-300">Lotação:</span> {profile.lotacao}</p>
            {profile.responsavel && (
              <p><span className="text-slate-300">Responsável:</span> {profile.responsavel}</p>
            )}
          </div>
        </div>
      )}

      {/* Sincronização */}
      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <RefreshCw size={16} className="text-emerald-400" />
          <h3 className="font-semibold text-sm">Sincronização</h3>
        </div>
        <p className="text-xs text-slate-400 mb-3 leading-relaxed">
          Registros salvos offline serão enviados ao servidor.
          Use este botão caso algum registro apareça como <strong className="text-slate-300">pendente sync</strong>.
        </p>
        <button
          onClick={handleSincronizar}
          disabled={syncing}
          className="btn-secondary w-full flex items-center justify-center gap-2 text-sm"
        >
          <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
          {syncing ? 'Sincronizando...' : 'Sincronizar agora'}
        </button>
        {syncResult && (
          <p className={`text-xs mt-2 text-center ${syncResult.startsWith('✓') ? 'text-green-400' : 'text-red-400'}`}>
            {syncResult}
          </p>
        )}
      </div>

      {/* LGPD */}
      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <Shield size={16} className="text-blue-400" />
          <h3 className="font-semibold text-sm">Seus Dados (LGPD)</h3>
        </div>
        <p className="text-xs text-slate-400 mb-3 leading-relaxed">
          Armazenamos apenas: data, hora e tipo de marcação, justificativas de horas extras.
          Imagens dos comprovantes <strong className="text-slate-300">nunca são salvas</strong>.
        </p>

        <div className="space-y-2">
          <button
            onClick={handleExportarDados}
            className="btn-secondary w-full flex items-center justify-center gap-2 text-sm"
          >
            <Download size={14} />
            Exportar meus dados (JSON)
          </button>

          <button
            onClick={handleExcluirHistorico}
            disabled={loading}
            className={`w-full flex items-center justify-center gap-2 text-sm px-4 py-2.5 rounded-xl transition-colors
              ${confirmDelete
                ? 'bg-red-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
          >
            <Trash2 size={14} />
            {confirmDelete ? 'Confirmar exclusão do histórico' : 'Excluir histórico de marcações'}
          </button>
        </div>
      </div>

      {msg && (
        <p className="text-xs text-green-400 text-center">{msg}</p>
      )}

      {/* Conta */}
      <div className="card space-y-2">
        <button
          onClick={signOut}
          className="btn-secondary w-full flex items-center justify-center gap-2"
        >
          <LogOut size={16} />
          Sair
        </button>
        <button
          onClick={handleExcluirConta}
          disabled={loading}
          className="w-full text-xs text-red-500 hover:text-red-400 py-2 transition-colors"
        >
          Excluir minha conta permanentemente
        </button>
      </div>

      <p className="text-xs text-slate-600 text-center">
        Gestor de Ponto SENAI — v1.0.0
      </p>
    </div>
  )
}
