import { useEffect } from 'react'
import { supabase } from '@/services/supabase/client'
import { useAuthStore } from '@/store'
import { cacheProfile, getCachedProfile } from '@/services/supabase/localDb'

export function useAuth() {
  const { userId, isAuthenticated, isLoading, profile, setUserId, setProfile, setLoading, logout } =
    useAuthStore()

  useEffect(() => {
    // Verificar sessão existente
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setUserId(session.user.id)
        await loadProfile(session.user.id)
      } else {
        // Tentar carregar profile cacheado offline
        const cached = await getCachedProfile()
        if (cached) {
          setProfile(cached as import('@/types').Profile)
        }
      }
      setLoading(false)
    })

    // Ouvir mudanças de sessão
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
