import { useState } from 'react'
import { useAuth } from '@/features/auth/useAuth'
import { AlertCircle } from 'lucide-react'

export function Login() {
  const { signInWithGoogle } = useAuth()
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  const handleGoogleLogin = async () => {
    setLoading(true)
    setErro('')
    try {
      await signInWithGoogle()
    } catch (e) {
      setErro('Erro ao conectar com Google. Tente novamente.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 p-6">
      {/* Logo / Branding */}
      <div className="text-center mb-10">
        <div className="w-20 h-20 bg-red-600 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-red-900">
          <svg viewBox="0 0 24 24" fill="none" className="w-10 h-10 text-white" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="8" r="3" />
            <path d="M12 2v2M12 14v8M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-slate-100">Gestor de Ponto</h1>
        <p className="text-slate-400 text-sm mt-1">SENAI CETEC Palmas</p>
      </div>

      {/* Card de login */}
      <div className="w-full max-w-sm card space-y-5">
        <div>
          <h2 className="font-semibold text-slate-100 text-lg">Entrar</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Use sua conta institucional Google para acessar.
          </p>
        </div>

        {erro && (
          <div className="flex items-center gap-2 text-red-400 text-sm bg-red-950 rounded-lg px-3 py-2">
            <AlertCircle size={14} />
            {erro}
          </div>
        )}

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-100 text-slate-800 font-semibold px-4 py-3 rounded-xl transition-all disabled:opacity-50"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg viewBox="0 0 24 24" className="w-5 h-5">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          )}
          {loading ? 'Conectando...' : 'Entrar com Google'}
        </button>

        <p className="text-xs text-slate-500 text-center leading-relaxed">
          Ao entrar, você concorda com o tratamento dos seus dados conforme a{' '}
          <strong className="text-slate-400">LGPD</strong>. Apenas dados de
          registro de ponto serão armazenados. As imagens dos comprovantes
          não são salvas.
        </p>
      </div>
    </div>
  )
}
