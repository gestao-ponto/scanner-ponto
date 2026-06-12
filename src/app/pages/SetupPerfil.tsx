import { useState } from 'react'
import { supabase } from '@/services/supabase/client'
import { useAuthStore } from '@/store'
import { cacheProfile } from '@/services/supabase/localDb'
import { UserCircle } from 'lucide-react'

export function SetupPerfil() {
  const { userId, setProfile } = useAuthStore()
  const [form, setForm] = useState({
    nome: '',
    matricula: '',
    funcao: '',
    lotacao: 'CETEC PALMAS',
    centro_custo: '',
    responsavel: '',
  })
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  const handleChange = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return

    if (!form.nome || !form.matricula || !form.funcao) {
      setErro('Preencha os campos obrigatórios.')
      return
    }

    setLoading(true)
    setErro('')

    try {
      const payload = {
        user_id: userId,
        ...form,
        lgpd_aceite: true,
        lgpd_aceite_at: new Date().toISOString(),
      }

      const { data, error } = await supabase
        .from('profiles')
        .insert(payload)
        .select()
        .single()

      if (error) throw error

      await supabase.from('consents').insert({
        user_id: userId,
        tipo: 'lgpd_aceite',
        aceito: true,
        ip_address: null,
        user_agent: navigator.userAgent,
      })

      setProfile(data as import('@/types').Profile)
      await cacheProfile(data)
    } catch (e) {
      setErro('Erro ao salvar perfil. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-slate-700 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <UserCircle size={32} className="text-slate-300" />
          </div>
          <h1 className="text-xl font-bold">Configure seu perfil</h1>
          <p className="text-slate-400 text-sm mt-1">Esses dados serão usados nos documentos exportados</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4">
          {[
            { field: 'nome', label: 'Nome completo *', placeholder: 'Nome completo' },
            { field: 'matricula', label: 'Matrícula *', placeholder: '0000' },
            { field: 'funcao', label: 'Função *', placeholder: 'Cargo / Função' },
            { field: 'lotacao', label: 'Lotação', placeholder: 'Unidade / Setor' },
            { field: 'centro_custo', label: 'Centro de Custo', placeholder: 'Centro de custo' },
            { field: 'responsavel', label: 'Responsável / Gerente', placeholder: 'Nome do Gerente completo' },
          ].map(({ field, label, placeholder }) => (
            <div key={field}>
              <label className="text-sm text-slate-400 mb-1 block">{label}</label>
              <input
                type="text"
                className="input"
                placeholder={placeholder}
                value={form[field as keyof typeof form]}
                onChange={(e) => handleChange(field, e.target.value)}
              />
            </div>
          ))}

          {erro && <p className="text-xs text-red-400">{erro}</p>}

          {/* Termo LGPD */}
          <div className="bg-slate-700/50 rounded-xl p-3 text-xs text-slate-400">
            <p className="font-medium text-slate-300 mb-1">Consentimento LGPD</p>
            <p>
              Ao salvar, você consente com o armazenamento dos dados acima para fins de
              controle de ponto. Imagens não são armazenadas. Você pode exportar ou excluir
              seus dados a qualquer momento nas configurações.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {loading && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            Salvar e continuar
          </button>
        </form>
      </div>
    </div>
  )
}