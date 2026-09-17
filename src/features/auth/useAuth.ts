import { useEffect } from 'react'
import { supabase } from '@/services/supabase/client'
import { useAuthStore } from '@/store'
import { cacheProfile, getCachedProfile, clearAllLocalData } from '@/services/supabase/localDb'

export function useAuth() {
  const { userId, isAuthenticated, isLoading, profile, setUserId, setProfile, setLoading, logout } =
    useAuthStore()

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const valido = await sessaoValidaNoServidor()
        if (!valido) {
          console.warn('[useAuth] Sessão local não corresponde a um usuário válido no servidor. Encerrando sessão.')
          await signOut()
          setLoading(false)
          return
        }
        setUserId(session.user.id)
        await loadProfile(session.user.id)
      } else {
        const cached = await getCachedProfile()
        if (cached) {
          setProfile(cached as import('@/types').Profile)
        }
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setUserId(session.user.id)
        await loadProfile(session.user.id)
      } else if (event === 'SIGNED_OUT') {
        logout()
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Confirma com o servidor (não apenas o token em cache local) que a sessão
  // ainda corresponde a um usuário existente. Evita erros de foreign key ao
  // tentar salvar dados com um user_id de uma sessão obsoleta/revogada.
  async function sessaoValidaNoServidor(): Promise<boolean> {
    const { data, error } = await supabase.auth.getUser()
    return !error && !!data.user
  }


  async function loadProfile(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (!error && data) {
      setProfile(data as import('@/types').Profile)
      await cacheProfile(data)
    }
  }

  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/scanner-ponto/`,
      },
    })
    if (error) throw error
  }

  async function signOut() {
    await clearAllLocalData()
    await supabase.auth.signOut()
    logout()
  }

  return {
    userId,
    isAuthenticated,
    isLoading,
    profile,
    signInWithGoogle,
    signOut,
  }
}