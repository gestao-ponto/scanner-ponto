import { useEffect } from 'react'
import { useAuth } from '@/features/auth/useAuth'
import { useUIStore } from '@/store'
import { Login } from '@/app/pages/Login'
import { SetupPerfil } from '@/app/pages/SetupPerfil'
import { AppLayout } from '@/app/pages/AppLayout'
import { UpdateBanner } from '@/app/components/UpdateBanner'

export default function App() {
  const { isAuthenticated, isLoading, profile } = useAuth()
  const { setAtualizacaoDisponivel } = useUIStore()

  // Uma nova versão já foi instalada e assumiu o controle da página (SW com
  // skipWaiting+clientsClaim). Antes isso disparava um reload IMEDIATO e sem
  // aviso — se acontecesse no meio de um escaneamento, a leitura se perdia e
  // o app "voltava pra tela inicial" sem o usuário saber se o ponto foi
  // salvo. Agora só avisamos; quem decide a hora de atualizar é o usuário.
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    const handleControllerChange = () => setAtualizacaoDisponivel(true)
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange)
    return () => navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange)
  }, [])

  if (isLoading) {
    return (
      <>
        <UpdateBanner />
        <div className="min-h-screen flex items-center justify-center bg-slate-900">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-400 text-sm">Carregando...</p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <UpdateBanner />
      {!isAuthenticated ? <Login /> : !profile ? <SetupPerfil /> : <AppLayout />}
    </>
  )
}
