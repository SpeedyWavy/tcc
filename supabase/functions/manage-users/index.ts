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

  return {
    ...(allowedOrigins.has(origin) ? { 'Access-Control-Allow-Origin': origin } : {}),
    'Vary': 'Origin',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
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

async function hashPassword(password: string) {
  // Carrega bcrypt sob demanda para que uma falha ao resolver o pacote não
  // impeça a função de iniciar e responder ao preflight CORS.
  const bcryptModule = await import('npm:bcryptjs@2.4.3')
  const hashSync = bcryptModule.hashSync || bcryptModule.default?.hashSync
  if (typeof hashSync !== 'function') {
    throw new Error('O módulo bcryptjs não disponibilizou hashSync.')
  }
  return hashSync(password, 12)
}

async function requireAdmin(request: Request) {
  const userClient = createUserClient(request)
  const { data, error } = await userClient.auth.getUser()

  if (error || !data.user) {
    return { error: 'Autentica inv.', status: 401 as const }
  }

  const jwtRole = data.user.app_metadata?.role
  if (jwtRole === 'admin') {
    return { user: data.user }
  }

  const adminClient = createAdminClient()
  const { data: userRecord, error: userError } = await adminClient
    .from('users')
    .select('role')
    .eq('auth_user_id', data.user.id)
    .maybeSingle()

  if (userError || userRecord?.role !== 'admin') {
    return { error: 'Admin access required.', status: 403 as const }
  }

  return { user: data.user }
}

async function findAuthUserByRecord(adminClient: ReturnType<typeof createAdminClient>, record: { id?: string; email?: string }) {
  if ((record as { auth_user_id?: string }).auth_user_id) {
    const { data } = await adminClient.auth.admin.getUserById((record as { auth_user_id?: string }).auth_user_id || '')
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

  return data.users.find((user: { email?: string }) => user.email === email) ?? null
}

async function createManagedUser(request: Request, targetRole: 'admin' | 'driver', payload: Record<string, unknown>) {
  const fullName = normalizeText(payload.full_name)
  const email = normalizeText(payload.email)
  const password = normalizeText(payload.password)

  if (!fullName || !email || !password) {
    return jsonResponse(request, { detail: 'Nome, email e senha sao obrigat.' }, 400)
  }
  if (password.length < 3 || new TextEncoder().encode(password).length > 72) {
    return jsonResponse(request, { detail: 'A senha deve ter de 3 a 72 bytes.' }, 400)
  }

  let passwordHash: string
  try {
    passwordHash = await hashPassword(password)
  } catch (error) {
    console.error('Falha ao carregar bcryptjs para criar usuário:', error)
    return jsonResponse(request, { detail: 'Não foi possível preparar a senha do usuário.' }, 500)
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
    return jsonResponse(request, { detail: authError?.message || 'N foi possivel criar o usu autenticado.' }, 400)
  }

  const authUser = authData.user
  const userRecord: Record<string, unknown> = {
    id: authUser.id,
    auth_user_id: authUser.id,
    full_name: fullName,
    password: passwordHash,
    role: targetRole,
    cpf: normalizeText(payload.cpf),
    email,
    rg: normalizeText(payload.rg),
    cnh_category: normalizeText(payload.cnh_category),
    transport_identification: normalizeText(payload.transport_identification),
    contact: normalizeText(payload.contact),
    schedules: normalizeText(payload.schedules),
    unit: normalizeText(payload.unit),
    photo_url: normalizeText(payload.photo_url) || null,
    created_at: new Date().toISOString(),
  }

  // Resolve photo_url from photo_path if provided and photo_url is empty
  const photoPath = typeof payload.photo_path === 'string' ? payload.photo_path.trim() : ''
  if ((!userRecord.photo_url || userRecord.photo_url === null) && photoPath) {
    try {
      const { data: publicData } = await adminClient.storage.from('user-photos').getPublicUrl(photoPath)
      let publicUrl = publicData?.publicUrl
      if (!publicUrl) {
        const { data: signedData, error: signedError } = await adminClient.storage
          .from('user-photos')
          .createSignedUrl(photoPath, 60)
        if (!signedError && signedData?.signedUrl) {
          publicUrl = signedData.signedUrl
        }
      }

      if (publicUrl) {
        userRecord.photo_url = publicUrl
      }
    } catch (err) {
      console.error('Erro ao resolver photo_path para photo_url (create user)', err)
    }
  }

  const { data: insertedUser, error: insertError } = await adminClient
    .from('users')
    .insert(userRecord)
    .select('*')
    .single()

  if (insertError) {
    await adminClient.auth.admin.deleteUser(authUser.id)
    return jsonResponse(request, { detail: insertError.message || 'N foi possivel gravar o cadastro.' }, 400)
  }

  return jsonResponse(request, insertedUser, 201)
}

async function updateManagedUser(request: Request, targetRole: 'admin' | 'driver', userId: string, payload: Record<string, unknown>) {
  const fullName = normalizeText(payload.full_name)
  const email = normalizeText(payload.email)
  const password = normalizeText(payload.password)

  if (!fullName || !email) {
    return jsonResponse(request, { detail: 'Nome e email sao obrigat.' }, 400)
  }
  if (password && (password.length < 3 || new TextEncoder().encode(password).length > 72)) {
    return jsonResponse(request, { detail: 'A senha deve ter de 3 a 72 bytes.' }, 400)
  }

  let passwordHash: string | null = null
  if (password) {
    try {
      passwordHash = await hashPassword(password)
    } catch (error) {
      console.error('Falha ao carregar bcryptjs para atualizar usuário:', error)
      return jsonResponse(request, { detail: 'Não foi possível preparar a senha do usuário.' }, 500)
    }
  }

  const adminClient = createAdminClient()
  const { data: currentRecord, error: currentError } = await adminClient
    .from('users')
    .select('*')
    .eq('id', userId)
    .eq('role', targetRole)
    .maybeSingle()

  if (currentError) {
    return jsonResponse(request, { detail: currentError.message || 'N foi possivel localizar o usu.' }, 400)
  }

  if (!currentRecord) {
    return jsonResponse(request, { detail: 'Usu n encontrado.' }, 404)
  }

  const authUser = await findAuthUserByRecord(adminClient, currentRecord)
  if (!authUser) {
    return jsonResponse(request, { detail: 'N foi possivel localizar a conta autenticada.' }, 404)
  }

  const updateRecord: Record<string, unknown> = {
    auth_user_id: currentRecord.auth_user_id || authUser.id,
    full_name: fullName,
    cpf: normalizeText(payload.cpf),
    email,
    rg: normalizeText(payload.rg),
    cnh_category: normalizeText(payload.cnh_category),
    transport_identification: normalizeText(payload.transport_identification),
    contact: normalizeText(payload.contact),
    schedules: normalizeText(payload.schedules),
    unit: normalizeText(payload.unit),
    photo_url: normalizeText(payload.photo_url) || null,
    updated_at: new Date().toISOString(),
  }

  if (password) {
    updateRecord.password = passwordHash
  }

  // Resolve photo_url from photo_path if needed
  const photoPathUpdate = typeof payload.photo_path === 'string' ? payload.photo_path.trim() : ''
  if ((!updateRecord.photo_url || updateRecord.photo_url === null) && photoPathUpdate) {
    try {
      const { data: publicData } = await adminClient.storage.from('user-photos').getPublicUrl(photoPathUpdate)
      let publicUrl = publicData?.publicUrl
      if (!publicUrl) {
        const { data: signedData, error: signedError } = await adminClient.storage
          .from('user-photos')
          .createSignedUrl(photoPathUpdate, 60)
        if (!signedError && signedData?.signedUrl) {
          publicUrl = signedData.signedUrl
        }
      }

      if (publicUrl) {
        updateRecord.photo_url = publicUrl
      }
    } catch (err) {
      console.error('Erro ao resolver photo_path para photo_url (update user)', err)
    }
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
    return jsonResponse(request, { detail: authUpdateError?.message || 'N foi possivel atualizar a conta autenticada.' }, 400)
  }

  const { data: updatedUser, error: updateError } = await adminClient
    .from('users')
    .update(updateRecord)
    .eq('id', userId)
    .select('*')
    .single()

  if (updateError) {
    return jsonResponse(request, { detail: updateError.message || 'N foi possivel atualizar o cadastro.' }, 400)
  }

  return jsonResponse(request, updatedUser)
}

async function deleteManagedUser(request: Request, currentAuthUserId: string | undefined, targetRole: 'admin' | 'driver', userId: string) {
  const adminClient = createAdminClient()
  const { data: currentRecord, error: currentError } = await adminClient
    .from('users')
    .select('*')
    .eq('id', userId)
    .eq('role', targetRole)
    .maybeSingle()

  if (currentError) {
    return jsonResponse(request, { detail: currentError.message || 'N foi possivel localizar o usu.' }, 400)
  }

  if (!currentRecord) {
    return jsonResponse(request, { detail: 'Usu n encontrado.' }, 404)
  }

  if (targetRole === 'admin') {
    const { count } = await adminClient
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'admin')

    if ((count ?? 0) <= 1) {
      return jsonResponse(request, { detail: 'Deve existir pelo menos um administrador.' }, 400)
    }
  }

  const authUser = await findAuthUserByRecord(adminClient, currentRecord)
  if (authUser && currentAuthUserId && authUser.id === currentAuthUserId && targetRole === 'admin') {
    return jsonResponse(request, { detail: 'Voc n pode excluir a si mesmo.' }, 400)
  }

  const { error: deleteError } = await adminClient
    .from('users')
    .delete()
    .eq('id', userId)
    .eq('role', targetRole)

  if (deleteError) {
    return jsonResponse(request, { detail: deleteError.message || 'N foi possivel excluir o usu.' }, 400)
  }

  if (authUser) {
    const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(authUser.id)
    if (authDeleteError) {
      return jsonResponse(request, { detail: authDeleteError.message || 'Cadastro removido, mas a conta autenticada n pode ser apagada.' }, 400)
    }
  }

  return jsonResponse(request, { message: 'Usu exclu com sucesso.' })
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(request) })
  }

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    return jsonResponse(request, { detail: 'Vari de ambiente do Supabase n configuradas.' }, 500)
  }

  const adminCheck = await requireAdmin(request)
  if ('error' in adminCheck) {
    return jsonResponse(request, { detail: adminCheck.error }, adminCheck.status)
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
      return jsonResponse(request, { detail: 'ID obrigatorio.' }, 400)
    }

    const data = (payload.data as Record<string, unknown> | undefined) ?? {}
    return await updateManagedUser(request, userType, userId, data)
  }

  if (action === `delete_${userType}`) {
    if (!userId) {
      return jsonResponse(request, { detail: 'ID obrigatorio.' }, 400)
    }

    return await deleteManagedUser(request, adminCheck.user?.id, userType, userId)
  }

  return jsonResponse(request, { detail: 'Acao n suportada.' }, 400)
})
