/// <reference path="../types.d.ts" />

import { createClient } from 'npm:@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
function corsHeaders(request: Request) {
  const origin = request.headers.get('origin') ?? ''
  return {
    // A função recebe pedidos públicos do formulário de suporte. As ações
    // administrativas continuam protegidas por JWT e verificação da senha.
    // Refletir a origem evita bloquear domínios de preview do Vercel e portas
    // locais alternativas; CORS não é usado como mecanismo de autorização.
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  }
}

function respond(request: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(request), 'Content-Type': 'application/json' },
  })
}

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function createAdminClient() {
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  })
}

async function getDriverAuthUser(adminClient: ReturnType<typeof createAdminClient>, driver: { auth_user_id?: string | null; email?: string | null }) {
  if (driver.auth_user_id) {
    const { data, error } = await adminClient.auth.admin.getUserById(driver.auth_user_id)
    if (!error && data.user) return data.user
  }

  const email = text(driver.email).toLowerCase()
  if (!email) return null

  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw error
    const match = data.users.find((user) => user.email?.toLowerCase() === email)
    if (match) return match
    if (data.users.length < 1000) break
  }
  return null
}

async function requestPasswordSupport(request: Request, payload: Record<string, unknown>) {
  const email = text(payload.email).toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return respond(request, { detail: 'Digite um endereço de e-mail válido.' }, 400)
  }

  const adminClient = createAdminClient()
  const { data: driver, error: driverError } = await adminClient
    .from('users')
    .select('id, email, auth_user_id, password')
    .eq('role', 'driver')
    .eq('email', email)
    .maybeSingle()

  if (driverError) return respond(request, { detail: 'Não foi possível verificar o e-mail agora.' }, 500)
  if (!driver) {
    return respond(request, { detail: 'O e-mail digitado está incorreto ou não existe como cadastro de motorista.' }, 404)
  }

  let authUser
  try {
    authUser = await getDriverAuthUser(adminClient, driver)
  } catch {
    return respond(request, { detail: 'Não foi possível verificar a conta de acesso agora.' }, 500)
  }
  if (!authUser) {
    return respond(request, { detail: 'Este e-mail não está associado a uma conta de acesso ativa.' }, 404)
  }

  const { data: existing, error: existingError } = await adminClient
    .from('password_support_requests')
    .select('id')
    .eq('driver_id', driver.id)
    .eq('status', 'pending')
    .maybeSingle()
  if (existingError) return respond(request, { detail: 'Não foi possível registrar a solicitação.' }, 500)
  if (existing) return respond(request, { ok: true, message: 'Sua solicitação já está aguardando o administrador.' })

  const { error: insertError } = await adminClient.from('password_support_requests').insert({
    driver_id: driver.id,
    driver_email: email,
    status: 'pending',
  })
  if (insertError) return respond(request, { detail: 'Não foi possível registrar a solicitação.' }, 500)
  return respond(request, { ok: true, message: 'Solicitação enviada. Um administrador irá redefinir sua senha.' })
}

async function authenticateAdmin(request: Request, adminClient: ReturnType<typeof createAdminClient>) {
  const authorization = request.headers.get('Authorization') ?? ''
  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  })
  const { data, error } = await userClient.auth.getUser()
  if (error || !data.user) return { error: 'Sua sessão expirou. Entre novamente.', status: 401 }

  const { data: adminRecordById, error: adminIdError } = await adminClient
    .from('users')
    .select('id')
    .eq('role', 'admin')
    .eq('auth_user_id', data.user.id)
    .maybeSingle()
  let isAdmin = !adminIdError && Boolean(adminRecordById)
  if (!isAdmin && data.user.email) {
    const { data: adminRecordByEmail, error: adminEmailError } = await adminClient
      .from('users')
      .select('id')
      .eq('role', 'admin')
      .ilike('email', data.user.email)
      .maybeSingle()
    isAdmin = !adminEmailError && Boolean(adminRecordByEmail)
  }
  if (!isAdmin) return { error: 'Apenas administradores podem acessar essas solicitações.', status: 403 }
  return { user: data.user }
}

async function listRequests(request: Request, adminClient: ReturnType<typeof createAdminClient>) {
  const { data: requests, error } = await adminClient
    .from('password_support_requests')
    .select('id, driver_id, driver_email, status, created_at')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
  if (error) return respond(request, { detail: 'Não foi possível carregar as solicitações.' }, 500)

  const driverIds = [...new Set((requests || []).map((item) => item.driver_id).filter(Boolean))]
  const { data: drivers, error: driversError } = driverIds.length
    ? await adminClient.from('users').select('id, full_name, unit').in('id', driverIds)
    : { data: [], error: null }
  if (driversError) return respond(request, { detail: 'Não foi possível carregar os motoristas.' }, 500)

  const driversById = new Map((drivers || []).map((driver) => [driver.id, driver]))
  return respond(request, {
    requests: (requests || []).map((item) => ({
      ...item,
      driver_name: driversById.get(item.driver_id)?.full_name || 'Motorista',
      unit: driversById.get(item.driver_id)?.unit || '',
    })),
  })
}

async function resolveRequest(request: Request, payload: Record<string, unknown>, adminUser: { id: string; email?: string }, adminClient: ReturnType<typeof createAdminClient>) {
  const requestId = text(payload.request_id)
  const adminPassword = typeof payload.admin_password === 'string' ? payload.admin_password : ''
  const newPassword = typeof payload.new_password === 'string' ? payload.new_password : ''
  if (!requestId || !adminPassword || newPassword.length < 3 || new TextEncoder().encode(newPassword).length > 72) {
    return respond(request, { detail: 'Informe sua senha atual e uma nova senha com 3 a 72 bytes.' }, 400)
  }

  if (!adminUser.email) return respond(request, { detail: 'Não foi possível validar o e-mail do administrador.' }, 400)
  const verifier = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  })
  const { data: verified, error: passwordError } = await verifier.auth.signInWithPassword({
    email: adminUser.email,
    password: adminPassword,
  })
  if (passwordError || verified.user?.id !== adminUser.id) {
    return respond(request, { detail: 'A senha atual do administrador está incorreta.' }, 401)
  }

  const { data: ticket, error: ticketError } = await adminClient
    .from('password_support_requests')
    .select('id, driver_id, driver_email')
    .eq('id', requestId)
    .eq('status', 'pending')
    .maybeSingle()
  if (ticketError || !ticket?.driver_id) return respond(request, { detail: 'Solicitação não encontrada ou já atendida.' }, 404)

  const { data: driver, error: driverError } = await adminClient
    .from('users')
    .select('id, email, auth_user_id, password')
    .eq('id', ticket.driver_id)
    .eq('role', 'driver')
    .maybeSingle()
  if (driverError || !driver) return respond(request, { detail: 'O cadastro do motorista não foi encontrado.' }, 404)

  let driverAuthUser
  try {
    driverAuthUser = await getDriverAuthUser(adminClient, driver)
  } catch {
    return respond(request, { detail: 'Não foi possível localizar a conta autenticada do motorista.' }, 500)
  }
  if (!driverAuthUser) return respond(request, { detail: 'O motorista não possui uma conta de acesso vinculada.' }, 404)

  // Carrega o módulo apenas na redefinição: uma falha ao importar bcrypt não
  // deve impedir que a função inicialize nem que o preflight CORS seja atendido.
  const bcryptModule = await import('npm:bcryptjs@2.4.3')
  const hashSync = bcryptModule.hashSync || bcryptModule.default?.hashSync
  if (typeof hashSync !== 'function') throw new Error('O módulo bcryptjs não disponibilizou hashSync.')
  const senhaLegadaHash = hashSync(newPassword, 12)

  const { error: authUpdateError } = await adminClient.auth.admin.updateUserById(driverAuthUser.id, { password: newPassword })
  if (authUpdateError) return respond(request, { detail: authUpdateError.message || 'Não foi possível atualizar a senha do motorista.' }, 400)

  const { error: recordUpdateError } = await adminClient
    .from('users')
    .update({
      previous_password_hash: driver.password || null,
      password: senhaLegadaHash,
      password_changed_at: new Date().toISOString(),
      auth_user_id: driverAuthUser.id,
    })
    .eq('id', driver.id)
    .eq('role', 'driver')
  if (recordUpdateError) {
    return respond(request, { detail: 'A senha do Supabase Auth mudou, mas o cadastro legado não foi atualizado. Contate o suporte técnico.' }, 500)
  }

  const { error: resolveError } = await adminClient
    .from('password_support_requests')
    .update({ status: 'resolved', resolved_at: new Date().toISOString(), resolved_by: adminUser.id })
    .eq('id', ticket.id)
    .eq('status', 'pending')
  if (resolveError) return respond(request, { detail: 'Senha alterada, mas não foi possível concluir o registro da solicitação.' }, 500)

  return respond(request, { ok: true, message: 'Senha do motorista alterada. Informe a nova senha ao motorista com segurança.' })
}

Deno.serve(async (request) => {
  try {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(request) })
  if (request.method !== 'POST') return respond(request, { detail: 'Método não permitido.' }, 405)
  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    return respond(request, { detail: 'Variáveis de ambiente do Supabase não configuradas.' }, 500)
  }

  let payload: Record<string, unknown>
  try { payload = await request.json() } catch { return respond(request, { detail: 'Requisição inválida.' }, 400) }
  const action = text(payload.action)

  if (action === 'request') return await requestPasswordSupport(request, payload)

  const adminClient = createAdminClient()
  const auth = await authenticateAdmin(request, adminClient)
  if ('error' in auth) return respond(request, { detail: auth.error }, auth.status)
  if (action === 'list') return await listRequests(request, adminClient)
  if (action === 'resolve') return await resolveRequest(request, payload, auth.user, adminClient)
  return respond(request, { detail: 'Ação não suportada.' }, 400)
  } catch (error) {
    console.error('Falha não tratada em password-support:', error)
    const detail = error instanceof Error ? error.message : 'Erro interno ao processar o suporte.'
    return respond(request, { detail }, 500)
  }
})
