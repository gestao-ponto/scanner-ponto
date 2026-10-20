import { useEffect } from 'react'
import { CheckCircle, XCircle } from 'lucide-react'
import { useUIStore } from '@/store'

const DURACAO_MS = 3500

export function Toast() {
  const { toast, limparToast } = useUIStore()

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(limparToast, DURACAO_MS)
    return () => clearTimeout(timer)
  }, [toast])

  if (!toast) return null

  const sucesso = toast.tipo === 'sucesso'

  return (
    <div className="fixed left-1/2 -translate-x-1/2 bottom-20 z-[90] px-4 w-full max-w-sm">
      <div
        className="flex items-center gap-2.5 rounded-2xl px-4 py-3 shadow-lg"
        style={{
          background: sucesso ? 'var(--badge-green-bg, #052e1c)' : 'var(--badge-red-bg, #450a0a)',
          border: `1px solid ${sucesso ? 'var(--badge-green-text, #22c55e)55' : 'var(--badge-red-text, #ef4444)55'}`,
        }}
      >
        {sucesso
          ? <CheckCircle size={18} style={{ color: 'var(--badge-green-text, #22c55e)' }} className="shrink-0" />
          : <XCircle size={18} style={{ color: 'var(--badge-red-text, #ef4444)' }} className="shrink-0" />}
        <p className="text-sm font-medium" style={{ color: sucesso ? 'var(--badge-green-text, #22c55e)' : 'var(--badge-red-text, #ef4444)' }}>
          {toast.mensagem}
        </p>
      </div>
    </div>
  )
}
