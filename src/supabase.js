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

if (typeof window !== 'undefined') {
  const accessToken = getStoredToken()
  const refreshToken = getStoredRefreshToken()

  if (accessToken || refreshToken) {
    supabase.auth.setSession({
      access_token: accessToken || undefined,
      refresh_token: refreshToken || undefined,
    }).catch(() => {
      // Ignore failures; the client may restore session automatically.
    })
  }
}

export async function getSupabaseClient() {
  return supabase
}
