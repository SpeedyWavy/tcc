import { supabase } from './supabase.js'
import { clearSession, getStoredUser } from './auth.js'

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function parseJsonBody(body) {
  if (!body) {
    return {}
  }

  if (typeof body === 'string') {
    try {
      return JSON.parse(body)
    } catch {
      return {}
    }
  }

  return body
}

function getPathSegments(path) {
  return path.split('?')[0].split('/').filter(Boolean)
}

function handleSupabaseError(error, fallbackMessage) {
  if (error?.message) {
    throw new Error(error.message)
  }

  throw new Error(fallbackMessage)
}

async function invokeManageUsers(action, payload) {
  const { data, error } = await supabase.functions.invoke('manage-users', {
    body: {
      action,
      ...payload,
    },
  })

  if (error) {
    handleSupabaseError(error, 'Nao foi possivel concluir a operacao.')
  }

  return data
}

async function findDriverIdByName(driverName) {
  const fullName = normalizeText(driverName)
  if (!fullName) {
    return null
  }

  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('role', 'driver')
    .eq('full_name', fullName)
    .maybeSingle()

  if (error) {
    handleSupabaseError(error, 'Nao foi possivel localizar o motorista.')
  }

  return data?.id ?? null
}

function buildStudentRecord(student, isUpdate = false) {
  const name = normalizeText(student.name)
  const address = normalizeText(student.address)
  const responsibleName = normalizeText(student.responsible_name)
  const parentContact = normalizeText(student.parent_contact)
  const transportIdentification = normalizeText(student.transport_identification)
  const unit = normalizeText(student.unit)

  const record = {
    name,
    nome: name,
    rm: normalizeText(student.rm),
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
    updated_at: new Date().toISOString(),
  }

  if (!isUpdate) {
    record.latitude = null
    record.longitude = null
    record.route_id = null
    record.created_at = new Date().toISOString()
  }

  return record
}

async function handleStudents(method, studentId, body) {
  if (method === 'GET' && studentId) {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('id', studentId)
      .maybeSingle()

    if (error) {
      handleSupabaseError(error, 'Nao foi possivel localizar o aluno.')
    }

    return data
  }

  if (method === 'GET') {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      handleSupabaseError(error, 'Nao foi possivel carregar os alunos.')
    }

    return data ?? []
  }

  if (method === 'POST') {
    const { data, error } = await supabase.functions.invoke('manage-students', {
      body: {
        action: 'create_student',
        data: buildStudentRecord(parseJsonBody(body)),
      },
    })

    if (error) {
      handleSupabaseError(error, 'Nao foi possivel cadastrar o aluno.')
    }

    return data
  }

  if (method === 'PUT' && studentId) {
    const { data, error } = await supabase.functions.invoke('manage-students', {
      body: {
        action: 'update_student',
        id: studentId,
        data: buildStudentRecord(parseJsonBody(body), true),
      },
    })

    if (error) {
      handleSupabaseError(error, 'Nao foi possivel atualizar o aluno.')
    }

    return data
  }

  if (method === 'DELETE' && studentId) {
    const { data, error } = await supabase.functions.invoke('manage-students', {
      body: {
        action: 'delete_student',
        id: studentId,
      },
    })

    if (error) {
      handleSupabaseError(error, 'Nao foi possivel excluir o aluno.')
    }

    return data
  }

  throw new Error('Operacao de alunos nao suportada.')
}

async function handleUsers(method, userType, userId, body) {
  if (method === 'GET' && userId) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (error) {
      handleSupabaseError(error, 'Nao foi possivel localizar o usuario.')
    }

    return data
  }

  if (method === 'GET') {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('role', userType)
      .order('created_at', { ascending: false })

    if (error) {
      handleSupabaseError(error, 'Nao foi possivel carregar os usuarios.')
    }

    return data ?? []
  }

  if (method === 'POST') {
    return invokeManageUsers(`create_${userType}`, {
      data: parseJsonBody(body),
    })
  }

  if (method === 'PUT' && userId) {
    return invokeManageUsers(`update_${userType}`, {
      id: userId,
      data: parseJsonBody(body),
    })
  }

  if (method === 'DELETE' && userId) {
    return invokeManageUsers(`delete_${userType}`, {
      id: userId,
    })
  }

  throw new Error('Operacao de usuarios nao suportada.')
}

async function handleContacts(method) {
  if (method !== 'GET') {
    throw new Error('Operacao de contatos nao suportada.')
  }

  const { data, error } = await supabase.functions.invoke('list-contacts')

  if (error) {
    handleSupabaseError(error, 'Nao foi possivel carregar os contatos.')
  }

  return data ?? []
}

function formatRouteTime(value) {
  if (!value) {
    return 'Sem horário'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return 'Sem horário'
  }

  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

async function handleRoutes(method, body) {
  const currentUser = getStoredUser()

  if (method === 'POST') {
    const payload = parseJsonBody(body)
    const vehicleId = normalizeText(payload.vehicle_id)

    if (!vehicleId) {
      throw new Error('Informe o veiculo para criar a rota.')
    }

    const { data, error } = await supabase
      .from('routes')
      .insert({
        vehicle_id: vehicleId,
        driver_id: payload.driver_id || null,
        status: normalizeText(payload.status) || 'Aguardando Saida',
        stops: Array.isArray(payload.stops) ? payload.stops : [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('*')
      .single()

    if (error) {
      handleSupabaseError(error, 'Nao foi possivel criar a rota.')
    }

    return data
  }

  if (method !== 'GET') {
    throw new Error('Operacao de rotas nao suportada.')
  }

  const [routesResponse, vehiclesResponse, usersResponse, studentsResponse] = await Promise.all([
    supabase.from('routes').select('*').order('created_at', { ascending: false }),
    supabase.from('vehicles').select('id, license_plate, model, identification, driver_id, driver_name, unit'),
    supabase.from('users').select('id, full_name, role, contact, unit'),
    supabase.from('students').select('id, name, nome, route_id, updated_at, created_at'),
  ])

  if (routesResponse.error) {
    handleSupabaseError(routesResponse.error, 'Nao foi possivel carregar as rotas.')
  }

  if (vehiclesResponse.error) {
    handleSupabaseError(vehiclesResponse.error, 'Nao foi possivel carregar os veiculos.')
  }

  if (usersResponse.error) {
    handleSupabaseError(usersResponse.error, 'Nao foi possivel carregar os usuarios.')
  }

  if (studentsResponse.error) {
    handleSupabaseError(studentsResponse.error, 'Nao foi possivel carregar os alunos.')
  }

  const vehiclesById = new Map((vehiclesResponse.data ?? []).map((vehicle) => [vehicle.id, vehicle]))
  const usersById = new Map((usersResponse.data ?? []).map((user) => [user.id, user]))
  const studentsByRouteId = new Map()

  for (const student of studentsResponse.data ?? []) {
    if (!student.route_id) {
      continue
    }

    const routeStudents = studentsByRouteId.get(student.route_id) ?? []
    routeStudents.push(student)
    studentsByRouteId.set(student.route_id, routeStudents)
  }

  const routes = (routesResponse.data ?? []).map((route, index) => {
    const vehicle = vehiclesById.get(route.vehicle_id)
    const driver = usersById.get(route.driver_id)
    const stops = Array.isArray(route.stops) ? route.stops : []
    const studentsFromRoute = studentsByRouteId.get(route.id) ?? []
    const studentsFromStops = stops.map((stop) => ({
      id: stop.student_id || stop.id || stop.order || stop.student_name,
      nome: stop.student_name || 'Aluno sem nome',
      address: stop.address || '',
      order: stop.order || 0,
    }))
    const students = studentsFromStops.length > 0 ? studentsFromStops : studentsFromRoute.map((student, studentIndex) => ({
      id: student.id || `${route.id}-${studentIndex}`,
      nome: student.nome || student.name || 'Aluno sem nome',
      address: '',
      order: studentIndex + 1,
    }))

    return {
      id: route.id,
      rota: `Rota ${index + 1}`,
      horario: formatRouteTime(route.created_at || route.updated_at),
      status: route.status || 'Em andamento',
      vehicle_id: route.vehicle_id,
      vehicle_name: vehicle?.identification || vehicle?.model || vehicle?.license_plate || 'Veiculo nao informado',
      driver_id: route.driver_id,
      driver_name: driver?.full_name || vehicle?.driver_name || 'Motorista nao informado',
      status: route.status || 'Aguardando Saida',
      created_at: route.created_at,
      updated_at: route.updated_at,
      students,
    }
  })

  if (currentUser?.role === 'driver') {
    return routes.filter((route) => route.driver_id === currentUser.id)
  }

  return routes
}

async function handleVehicles(method, vehicleId, body) {
  if (method === 'GET' && vehicleId) {
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('id', vehicleId)
      .maybeSingle()

    if (error) {
      handleSupabaseError(error, 'Nao foi possivel localizar o veiculo.')
    }

    return data
  }

  if (method === 'GET') {
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      handleSupabaseError(error, 'Nao foi possivel carregar os veiculos.')
    }

    return data ?? []
  }

  const vehiclePayload = parseJsonBody(body)
  const resolvedDriverId = vehiclePayload.driver_id || (await findDriverIdByName(vehiclePayload.driver_name))
  const normalizedVehicle = {
    license_plate: normalizeText(vehiclePayload.license_plate),
    model: normalizeText(vehiclePayload.model) || normalizeText(vehiclePayload.identification),
    capacity: Number(vehiclePayload.capacity) || 0,
    driver_id: resolvedDriverId,
    driver_name: normalizeText(vehiclePayload.driver_name),
    identification: normalizeText(vehiclePayload.identification) || normalizeText(vehiclePayload.model),
    unit: normalizeText(vehiclePayload.unit),
    updated_at: new Date().toISOString(),
  }

  if (method === 'POST') {
    const { data, error } = await supabase
      .from('vehicles')
      .insert({
        ...normalizedVehicle,
        status: 'garage',
        created_at: new Date().toISOString(),
      })
      .select('*')
      .single()

    if (error) {
      handleSupabaseError(error, 'Nao foi possivel cadastrar o veiculo.')
    }

    return data
  }

  if (method === 'PUT' && vehicleId) {
    const { data, error } = await supabase
      .from('vehicles')
      .update(normalizedVehicle)
      .eq('id', vehicleId)
      .select('*')
      .maybeSingle()

    if (error) {
      handleSupabaseError(error, 'Nao foi possivel atualizar o veiculo.')
    }

    return data
  }

  if (method === 'DELETE' && vehicleId) {
    const { error } = await supabase
      .from('vehicles')
      .delete()
      .eq('id', vehicleId)

    if (error) {
      handleSupabaseError(error, 'Nao foi possivel excluir o veiculo.')
    }

    return { message: 'Veiculo excluido com sucesso' }
  }

  throw new Error('Operacao de veiculos nao suportada.')
}

export async function apiRequest(path, options = {}) {
  const method = (options.method || 'GET').toUpperCase()
  const segments = getPathSegments(path)
  const resource = segments[1]
  const itemId = segments[2] || null

  try {
    if (segments[0] !== 'api') {
      throw new Error(`Endpoint nao suportado: ${path}`)
    }

    if (resource === 'auth') {
      throw new Error('O login agora usa o Supabase direto.')
    }

    if (resource === 'students') {
      return await handleStudents(method, itemId, options.body)
    }

    if (resource === 'admins') {
      return await handleUsers(method, 'admin', itemId, options.body)
    }

    if (resource === 'drivers') {
      return await handleUsers(method, 'driver', itemId, options.body)
    }

    if (resource === 'vehicles') {
      return await handleVehicles(method, itemId, options.body)
    }

    if (resource === 'contacts') {
      return await handleContacts(method)
    }

    if (resource === 'routes') {
      return await handleRoutes(method, options.body)
    }

    throw new Error(`Endpoint nao suportado: ${path}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Nao foi possivel concluir a solicitacao.'

    if (message.toLowerCase().includes('jwt') || message.toLowerCase().includes('unauthorized')) {
      clearSession()
    }

    throw error instanceof Error ? error : new Error(message)
  }
}
