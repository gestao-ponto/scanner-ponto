import { RefreshCw } from 'lucide-react'
import { useUIStore } from '@/store'

// Mostrado quando uma nova versão do app já foi instalada em segundo plano.
// Só recarrega a página quando o usuário toca — nunca durante um
// escaneamento ou qualquer outra ação em andamento.
export function UpdateBanner() {
  const { atualizacaoDisponivel } = useUIStore()
  if (!atualizacaoDisponivel) return null

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-between gap-3 px-4 py-2.5"
      style={{ background: '#2563eb', color: '#fff' }}
    >
      <span className="text-sm font-medium">Nova versão disponível</span>
      <button
        onClick={() => window.location.reload()}
        className="flex items-center gap-1.5 text-xs font-semibold bg-white/20 hover:bg-white/30 rounded-lg px-3 py-1.5 transition-colors"
      >
        <RefreshCw size={13} />
        Atualizar agora
      </button>
    </div>
  )
}
