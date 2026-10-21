import { supabase, sessionReady } from '../supabase.js'
import { traduzirMensagemUsuario } from './traduzirMensagemUsuario.js'

export async function chamarSuporteSenha(payload) {
  await sessionReady
  const { data, error } = await supabase.functions.invoke('password-support', { body: payload })
  if (error) {
    if (error.name === 'FunctionsFetchError') {
      const causa = error.context instanceof Error ? error.context.message : String(error.context || '')
      console.error('Falha de rede ao chamar password-support:', error.context)
      throw new Error(
        `Falha de rede ou CORS ao chamar password-support${causa ? `: ${causa}` : '.'} Confira a URL do projeto Supabase e se a versao atual da funcao foi implantada.`,
      )
    }
    let detail = ''
    try {
      const response = error.context
      if (response && typeof response.json === 'function') {
        const body = await response.json()
        detail = body?.detail || body?.message || ''
      }
    } catch {
      // Usa a mensagem generica do cliente quando a resposta nao tem JSON.
    }
    throw new Error(traduzirMensagemUsuario(detail || error.message))
  }
  if (data?.detail) throw new Error(traduzirMensagemUsuario(data.detail))
  return data
}
