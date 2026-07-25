import { createClient } from '@supabase/supabase-js'
import { getStoredToken, getStoredRefreshToken } from './auth.js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export const supabase = createClient(supabaseUrl || '', supabaseKey || '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})

// Restaura a sessão a partir dos tokens salvos pelo auth.js (login customizado).
// Isso é ASSÍNCRONO. Qualquer código que vá consultar o Supabase logo em seguida
// (ex: api.js) precisa aguardar essa Promise antes de disparar queries, senão a
// query sai sem sessão autenticada e o RLS silenciosamente devolve 0 linhas
// (sem lançar erro), mesmo com dados existindo na tabela.
export const sessionReady = (async () => {
  if (typeof window === 'undefined') {
    return
  }

  const accessToken = getStoredToken()
  const refreshToken = getStoredRefreshToken()

  if (!accessToken && !refreshToken) {
    return
  }

  try {
    await supabase.auth.setSession({
      access_token: accessToken || undefined,
      refresh_token: refreshToken || undefined,
    })
  } catch {
    // Ignora falhas; o client pode restaurar a sessão automaticamente
    // via persistSession/autoRefreshToken.
  }
})()

export async function getSupabaseClient() {
  await sessionReady
  return supabase
}