// ─── Tradução de erros técnicos para mensagens compreensíveis ao usuário ──────
//
// Qualquer erro (Postgrest/Supabase, rede, Edge Function) deve passar por
// aqui antes de ser exibido na UI. O erro técnico original continua indo
// pro console (via dbg/console.error nos call sites) para diagnóstico —
// só o texto amigável chega ao usuário.

interface ErroComCodigo {
  code?: string
  message?: string
  context?: Response
}

const MENSAGENS_POR_CODIGO: Record<string, string> = {
  '23503': 'Sua sessão expirou. Saia e entre novamente para continuar.',
  '42501': 'Você não tem permissão para fazer essa operação. Tente sair e entrar novamente.',
  '23502': 'Um campo obrigatório não foi preenchido. Verifique os dados e tente de novo.',
  '23505': 'Esse registro já existe.',
  '42P01': 'O sistema está com um problema de configuração no banco de dados. Contate o suporte.',
  PGRST116: 'Registro não encontrado.',
}

function pareceTecnica(mensagem: string): boolean {
  const m = mensagem.toLowerCase()
  return (
    m.includes('edge function') ||
    m.includes('non-2xx') ||
    m.includes('fetch') ||
    m.includes('network') ||
    m.includes('failed to fetch') ||
    m.includes('typeerror') ||
    m.includes('undefined is not') ||
    m.includes('cannot read propert') ||
    /^[a-z0-9_]+error/i.test(m) ||
    m.trim() === ''
  )
}

export async function mensagemErroAmigavel(erro: unknown): Promise<string> {
  const e = erro as ErroComCodigo

  if (e?.code && MENSAGENS_POR_CODIGO[e.code]) {
    return MENSAGENS_POR_CODIGO[e.code]
  }

  // Erro de Edge Function do Supabase: o motivo real vem no corpo da resposta,
  // não em `error.message` (que é sempre um texto genérico em inglês).
  if (e?.context && typeof e.context.json === 'function') {
    try {
      const body = await e.context.json()
      if (body?.error) return body.error as string
    } catch {
      // corpo não é JSON válido — segue para os outros fallbacks
    }
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return 'Sem conexão com a internet. Verifique sua rede e tente novamente.'
  }

  const mensagem = e?.message ?? String(erro)

  if (!mensagem || pareceTecnica(mensagem)) {
    return 'Não foi possível completar a operação. Tente novamente em instantes.'
  }

  return mensagem
}
