/// <reference path="../types.d.ts" />

import { createClient } from 'npm:@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const allowedOrigins = new Set(
  (Deno.env.get('CORS_ORIGINS') ?? 'http://localhost:5173,https://tccdobrulezzi.vercel.app')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
)

function getCorsHeaders(request: Request) {
  const origin = request.headers.get('origin') ?? ''
  const allowOrigin = allowedOrigins.has(origin) ? origin : 'http://localhost:5173'

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Vary': 'Origin',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
}

function jsonResponse(request: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...getCorsHeaders(request),
      'Content-Type': 'application/json',
    },
  })
}

function createUserClient(request: Request) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: request.headers.get('Authorization') ?? '',
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  })
}

function createAdminClient() {
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  })
}

async function requireAdmin(request: Request) {
  const userClient = createUserClient(request)
  const { data, error } = await userClient.auth.getUser()

  if (error || !data.user) {
    return { error: 'Autenticacao invalida.', status: 401 as const }
  }

  const jwtRole = data.user.app_metadata?.role
  if (jwtRole === 'admin') {
    return { user: data.user }
  }

  const adminClient = createAdminClient()
  const { data: userRecord } = await adminClient
    .from('users')
    .select('role')
    .eq('auth_user_id', data.user.id)
    .maybeSingle()

  if (userRecord?.role !== 'admin') {
    return { error: 'Admin access required.', status: 403 as const }
  }

  return { user: data.user }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(request) })
  }

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    return jsonResponse(request, { detail: 'Variaveis de ambiente do Supabase nao configuradas.' }, 500)
  }

  const adminCheck = await requireAdmin(request)
  if ('error' in adminCheck) {
    return jsonResponse(request, { detail: adminCheck.error }, adminCheck.status)
  }

  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from('users')
    .select('id, full_name, contact, unit')
    .eq('role', 'admin')
    .order('role', { ascending: true })
    .order('full_name', { ascending: true })

  if (error) {
    return jsonResponse(request, { detail: error.message || 'Nao foi possivel carregar os contatos.' }, 400)
  }

  return jsonResponse(request, data ?? [])
})
