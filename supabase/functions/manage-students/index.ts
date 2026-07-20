/// <reference path="../types.d.ts" />

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

function shouldSkipStudentValidation(payload: Record<string, unknown>) {
  const keys = Object.keys(payload)
  if (!keys.includes('route_id')) {
    return false
  }

  return keys.every((key) => ['route_id', 'photo_path', 'photo_url'].includes(key))
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
  const { data: userRecord } = await adminClient
    .from('users')
    .select('role')
    .eq('id', data.user.id)
    .maybeSingle()

  if (userRecord?.role !== 'admin') {
    return { error: 'Admin access required.', status: 403 as const }
  }

  return { user: data.user }
}

function buildStudentRecord(payload: Record<string, unknown>, isUpdate = false) {
  const name = normalizeText(payload.name)
  const address = normalizeText(payload.address)
  const responsibleName = normalizeText(payload.responsible_name)
  const parentContact = normalizeText(payload.parent_contact)
  const transportIdentification = normalizeText(payload.transport_identification)
  const unit = normalizeText(payload.unit)

  const photoUrl = typeof payload.photo_url === 'string' ? payload.photo_url.trim() : ''

  const record: Record<string, unknown> = {
    name,
    nome: name,
    rm: normalizeText(payload.rm),
    address,
    endereco: address,
    parent_contact: parentContact,
    contato_responsavel: parentContact,
    responsible_name: responsibleName,
    responsavel: responsibleName,
    transport_identification: transportIdentification,
    transporte: transportIdentification,
    unit,
    unidade: unit,
    photo_url: photoUrl || null,
    route_id: payload.route_id ?? null,
    updated_at: new Date().toISOString(),
  }

  if (!isUpdate) {
    record.latitude = payload.latitude ?? null
    record.longitude = payload.longitude ?? null
    record.created_at = new Date().toISOString()
  }

  return record
}

function validateStudentPayload(payload: Record<string, unknown>) {
  if (shouldSkipStudentValidation(payload)) {
    return []
  }

  const requiredFields = [
    'name',
    'rm',
    'responsible_name',
    'parent_contact',
    'address',
    'transport_identification',
    'unit',
  ]

  const missingFields = requiredFields.filter((field) => !normalizeText(payload[field]))
  return missingFields
}

async function createStudent(payload: Record<string, unknown>) {
  const missingFields = validateStudentPayload(payload)
  if (missingFields.length > 0) {
    return jsonResponse({ detail: 'Preencha todos os campos do cadastro do aluno.' }, 400)
  }

  const adminClient = createAdminClient()
  // Allow server-side resolution of photo_url from a provided photo_path
  const record = buildStudentRecord(payload)
  const photoPath = typeof payload.photo_path === 'string' ? payload.photo_path.trim() : ''
  if ((!record.photo_url || record.photo_url === null) && photoPath) {
    try {
      const { data: publicData } = adminClient.storage.from('user-photos').getPublicUrl(photoPath)
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
        record.photo_url = publicUrl
      }
    } catch (err) {
      // ignore storage errors and proceed without photo_url
      console.error('Erro ao resolver photo_path para photo_url', err)
    }
  }

  const { data, error } = await adminClient
    .from('students')
    .insert(record)
    .select('*')
    .single()

  if (error) {
    return jsonResponse({ detail: error.message || 'Nao foi possivel cadastrar o aluno.' }, 400)
  }

  return jsonResponse(data, 201)
}

async function updateStudent(studentId: string, payload: Record<string, unknown>) {
  const adminClient = createAdminClient()
  const { data: existingStudent, error: existingError } = await adminClient
    .from('students')
    .select('*')
    .eq('id', studentId)
    .maybeSingle()

  if (existingError) {
    return jsonResponse({ detail: existingError.message || 'Nao foi possivel localizar o aluno.' }, 400)
  }

  const mergedPayload = { ...(existingStudent || {}), ...payload }
  if (payload.route_id !== undefined && payload.route_id !== null && existingStudent?.route_id && existingStudent.route_id !== payload.route_id) {
    return jsonResponse({ detail: 'Este aluno já está vinculado a outra rota.' }, 400)
  }

  const missingFields = validateStudentPayload(mergedPayload)
  if (missingFields.length > 0) {
    return jsonResponse({ detail: 'Preencha todos os campos do cadastro do aluno.' }, 400)
  }

  // Resolve photo_url from photo_path if needed before update
  const record = buildStudentRecord(mergedPayload, true)
  const photoPath = typeof payload.photo_path === 'string' ? payload.photo_path.trim() : ''
  if ((!record.photo_url || record.photo_url === null) && photoPath) {
    try {
      const { data: publicData } = adminClient.storage.from('user-photos').getPublicUrl(photoPath)
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
        record.photo_url = publicUrl
      }
    } catch (err) {
      console.error('Erro ao resolver photo_path para photo_url', err)
    }
  }

  const { data, error } = await adminClient
    .from('students')
    .update(record)
    .eq('id', studentId)
    .select('*')
    .maybeSingle()

  if (error) {
    return jsonResponse({ detail: error.message || 'Nao foi possivel atualizar o aluno.' }, 400)
  }

  if (!data) {
    return jsonResponse({ detail: 'Aluno nao encontrado.' }, 404)
  }

  return jsonResponse(data)
}

async function deleteStudent(studentId: string) {
  const adminClient = createAdminClient()
  const { error } = await adminClient.from('students').delete().eq('id', studentId)

  if (error) {
    return jsonResponse({ detail: error.message || 'Nao foi possivel excluir o aluno.' }, 400)
  }

  return jsonResponse({ message: 'Aluno excluido com sucesso.' })
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    return jsonResponse({ detail: 'Variaveis de ambiente do Supabase nao configuradas.' }, 500)
  }

  // Allow an internal service invocation using the Service Role key via header
  // (header name: x-service-role). This bypass is intended for internal tests only.
  let adminCheck: any = {}
  const serviceRoleHeader = request.headers.get('x-service-role') || request.headers.get('x-supabase-service-role')
  if (serviceRoleHeader && serviceRoleHeader === supabaseServiceRoleKey) {
    adminCheck = { user: { id: 'service' } }
  } else {
    adminCheck = await requireAdmin(request)
    if ('error' in adminCheck) {
      return jsonResponse({ detail: adminCheck.error }, adminCheck.status)
    }
  }

  let payload: Record<string, unknown> = {}
  try {
    payload = await request.json()
  } catch {
    payload = {}
  }

  const action = normalizeText(payload.action)
  const studentId = normalizeText(payload.id)
  const data = (payload.data as Record<string, unknown> | undefined) ?? {}

  if (action === 'create_student') {
    return await createStudent(data)
  }

  if (action === 'update_student') {
    if (!studentId) {
      return jsonResponse({ detail: 'ID obrigatorio.' }, 400)
    }

    return await updateStudent(studentId, data)
  }

  if (action === 'delete_student') {
    if (!studentId) {
      return jsonResponse({ detail: 'ID obrigatorio.' }, 400)
    }

    return await deleteStudent(studentId)
  }

  return jsonResponse({ detail: 'Acao nao suportada.' }, 400)
})
