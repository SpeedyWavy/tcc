import { createClient } from 'npm:@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
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

async function requireAuthenticatedUser(request: Request) {
  const userClient = createUserClient(request)
  const { data, error } = await userClient.auth.getUser()

  if (error || !data.user) {
    return { error: 'Autenticacao invalida.', status: 401 as const }
  }

  return { user: data.user }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    return jsonResponse({ detail: 'Variaveis de ambiente do Supabase nao configuradas.' }, 500)
  }

  const authCheck = await requireAuthenticatedUser(request)
  if ('error' in authCheck) {
    return jsonResponse({ detail: authCheck.error }, authCheck.status)
  }

  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from('users')
    .select('id, full_name, role, contact, email, unit, transport_identification, cpf')
    .in('role', ['admin', 'driver'])
    .order('role', { ascending: true })
    .order('full_name', { ascending: true })

  if (error) {
    return jsonResponse({ detail: error.message || 'Nao foi possivel carregar os contatos.' }, 400)
  }

  return jsonResponse(data ?? [])
})
