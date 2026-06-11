import { useEffect } from 'react'
import { useAuth } from '@/features/auth/useAuth'
import { Login } from '@/app/pages/Login'
import { SetupPerfil } from '@/app/pages/SetupPerfil'
import { AppLayout } from '@/app/pages/AppLayout'

export default function App() {
  const { isAuthenticated, isLoading, profile } = useAuth()

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload()
      })
    }
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) return <Login />
  if (!profile) return <SetupPerfil />
  return <AppLayout />
}
