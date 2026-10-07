import { sessionReady, supabase } from '../supabase.js'

export async function carregarNotificacoes(limit = 100) {
  await sessionReady
  const { data, error } = await supabase
    .from('driver_announcements')
    .select('id, message, active, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data || []
}

export async function publicarNotificacao(message) {
  await sessionReady
  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError) throw authError
  if (!authData.user) throw new Error('Sua sessão expirou. Entre novamente para enviar a mensagem.')

  const { data, error } = await supabase
    .from('driver_announcements')
    .insert({ message: message.trim(), active: true, created_by: authData.user.id })
    .select('id')
    .single()

  if (error) throw error

  const { error: archiveError } = await supabase
    .from('driver_announcements')
    .update({ active: false })
    .eq('active', true)
    .neq('id', data.id)

  if (archiveError) throw archiveError
  return data
}

export function chaveNotificacaoDispensada(usuarioId) {
  return `notificacao-motorista-dispensada:${usuarioId || 'sessao'}`
}
