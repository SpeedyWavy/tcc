import { createClient } from 'npm:@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function normalizeText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeEmail(fullName: string) {
  return `${fullName
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '.')}@local.tcc`
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

async function requireAdmin(request: Request) {
  const userClient = createUserClient(request)
  const { data, error } = await userClient.auth.getUser()

  if (error || !data.user) {
    return { error: 'Autenticacao invalida.', status: 401 as const }
  }

  const jwtRole = data.user.app_metadata?.role || data.user.user_metadata?.role
  if (jwtRole === 'admin') {
    return { user: data.user }
  }

  const adminClient = createAdminClient()
  const { data: userRecord, error: userError } = await adminClient
    .from('users')
    .select('role')
    .eq('id', data.user.id)
    .maybeSingle()

  if (userError || userRecord?.role !== 'admin') {
    return { error: 'Admin access required.', status: 403 as const }
  }

  return { user: data.user }
}

async function findAuthUserByRecord(adminClient: ReturnType<typeof createAdminClient>, record: { id?: string; email?: string }) {
  if (record.id) {
    const { data } = await adminClient.auth.admin.getUserById(record.id)
    if (data.user) {
      return data.user
    }
  }

  const email = normalizeText(record.email)
  if (!email) {
    return null
  }

  const { data, error } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (error) {
    return null
  }

  return data.users.find((user) => user.email === email) ?? null
}

async function createManagedUser(request: Request, targetRole: 'admin' | 'driver', payload: Record<string, unknown>) {
  const fullName = normalizeText(payload.full_name)
  const email = normalizeText(payload.email)
  const password = normalizeText(payload.password)

  if (!fullName || !email || !password) {
    return jsonResponse({ detail: 'Nome, email e senha sao obrigatorios.' }, 400)
  }

  const adminClient = createAdminClient()

  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
    app_metadata: { full_name: fullName, role: targetRole },
  })

  if (authError || !authData.user) {
    return jsonResponse({ detail: authError?.message || 'Nao foi possivel criar o usuario autenticado.' }, 400)
  }

  const authUser = authData.user
  const userRecord = {
    id: authUser.id,
    full_name: fullName,
    password: null,
    role: targetRole,
    cpf: normalizeText(payload.cpf),
    email,
    rg: normalizeText(payload.rg),
    cnh_category: normalizeText(payload.cnh_category),
    transport_identification: normalizeText(payload.transport_identification),
    contact: normalizeText(payload.contact),
    schedules: normalizeText(payload.schedules),
    unit: normalizeText(payload.unit),
    created_at: new Date().toISOString(),
  }

  const { data: insertedUser, error: insertError } = await adminClient
    .from('users')
    .insert(userRecord)
    .select('*')
    .single()

  if (insertError) {
    await adminClient.auth.admin.deleteUser(authUser.id)
    return jsonResponse({ detail: insertError.message || 'Nao foi possivel gravar o cadastro.' }, 400)
  }

  return jsonResponse(insertedUser, 201)
}

async function updateManagedUser(request: Request, targetRole: 'admin' | 'driver', userId: string, payload: Record<string, unknown>) {
  const fullName = normalizeText(payload.full_name)
  const email = normalizeText(payload.email)
  const password = normalizeText(payload.password)

  if (!fullName || !email) {
    return jsonResponse({ detail: 'Nome e email sao obrigatorios.' }, 400)
  }

  const adminClient = createAdminClient()
  const { data: currentRecord, error: currentError } = await adminClient
    .from('users')
    .select('*')
    .eq('id', userId)
    .eq('role', targetRole)
    .maybeSingle()

  if (currentError) {
    return jsonResponse({ detail: currentError.message || 'Nao foi possivel localizar o usuario.' }, 400)
  }

  if (!currentRecord) {
    return jsonResponse({ detail: 'Usuario nao encontrado.' }, 404)
  }

  const authUser = await findAuthUserByRecord(adminClient, currentRecord)
  if (!authUser) {
    return jsonResponse({ detail: 'Nao foi possivel localizar a conta autenticada.' }, 404)
  }

  const updateRecord = {
    full_name: fullName,
    cpf: normalizeText(payload.cpf),
    email,
    rg: normalizeText(payload.rg),
    cnh_category: normalizeText(payload.cnh_category),
    transport_identification: normalizeText(payload.transport_identification),
    contact: normalizeText(payload.contact),
    schedules: normalizeText(payload.schedules),
    unit: normalizeText(payload.unit),
    updated_at: new Date().toISOString(),
  }

  const { data: updatedAuth, error: authUpdateError } = await adminClient.auth.admin.updateUserById(
    authUser.id,
    {
      email,
      password: password || undefined,
      email_confirm: true,
      user_metadata: { full_name: fullName },
      app_metadata: { full_name: fullName, role: targetRole },
    },
  )

  if (authUpdateError || !updatedAuth.user) {
    return jsonResponse({ detail: authUpdateError?.message || 'Nao foi possivel atualizar a conta autenticada.' }, 400)
  }

  const { data: updatedUser, error: updateError } = await adminClient
    .from('users')
    .update(updateRecord)
    .eq('id', userId)
    .select('*')
    .single()

  if (updateError) {
    return jsonResponse({ detail: updateError.message || 'Nao foi possivel atualizar o cadastro.' }, 400)
  }

  return jsonResponse(updatedUser)
}

async function deleteManagedUser(currentAuthUserId: string | undefined, targetRole: 'admin' | 'driver', userId: string) {
  const adminClient = createAdminClient()
  const { data: currentRecord, error: currentError } = await adminClient
    .from('users')
    .select('*')
    .eq('id', userId)
    .eq('role', targetRole)
    .maybeSingle()

  if (currentError) {
    return jsonResponse({ detail: currentError.message || 'Nao foi possivel localizar o usuario.' }, 400)
  }

  if (!currentRecord) {
    return jsonResponse({ detail: 'Usuario nao encontrado.' }, 404)
  }

  if (targetRole === 'admin') {
    const { count } = await adminClient
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'admin')

    if ((count ?? 0) <= 1) {
      return jsonResponse({ detail: 'Deve existir pelo menos um administrador.' }, 400)
    }
  }

  const authUser = await findAuthUserByRecord(adminClient, currentRecord)
  if (authUser && currentAuthUserId && authUser.id === currentAuthUserId && targetRole === 'admin') {
    return jsonResponse({ detail: 'Voce nao pode excluir a si mesmo.' }, 400)
  }

  const { error: deleteError } = await adminClient
    .from('users')
    .delete()
    .eq('id', userId)
    .eq('role', targetRole)

  if (deleteError) {
    return jsonResponse({ detail: deleteError.message || 'Nao foi possivel excluir o usuario.' }, 400)
  }

  if (authUser) {
    const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(authUser.id)
    if (authDeleteError) {
      return jsonResponse({ detail: authDeleteError.message || 'Cadastro removido, mas a conta autenticada nao pode ser apagada.' }, 400)
    }
  }

  return jsonResponse({ message: 'Usuario excluido com sucesso.' })
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    return jsonResponse({ detail: 'Variaveis de ambiente do Supabase nao configuradas.' }, 500)
  }

  const adminCheck = await requireAdmin(request)
  if ('error' in adminCheck) {
    return jsonResponse({ detail: adminCheck.error }, adminCheck.status)
  }

  let payload: Record<string, unknown> = {}
  try {
    payload = await request.json()
  } catch {
    payload = {}
  }

  const action = normalizeText(payload.action)
  const userType = action.includes('driver') ? 'driver' : 'admin'
  const userId = normalizeText(payload.id)

  if (action === `create_${userType}`) {
    const data = (payload.data as Record<string, unknown> | undefined) ?? {}
    return await createManagedUser(request, userType, data)
  }

  if (action === `update_${userType}`) {
    if (!userId) {
      return jsonResponse({ detail: 'ID obrigatorio.' }, 400)
    }

    const data = (payload.data as Record<string, unknown> | undefined) ?? {}
    return await updateManagedUser(request, userType, userId, data)
  }

  if (action === `delete_${userType}`) {
    if (!userId) {
      return jsonResponse({ detail: 'ID obrigatorio.' }, 400)
    }

    return await deleteManagedUser(adminCheck.user?.id, userType, userId)
  }

  return jsonResponse({ detail: 'Acao nao suportada.' }, 400)
})
