import { supabase, sessionReady } from './supabase.js'
import { clearSession, getStoredUser } from './auth.js'

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeName(value) {
  return normalizeText(value).toLowerCase()
}

function shouldSkipStudentValidation(payload) {
  if (!payload || typeof payload !== 'object') {
    return false
  }

  const keys = Object.keys(payload)
  if (!keys.includes('route_id')) {
    return false
  }

  return keys.every((key) => ['route_id', 'photo_path', 'photo_url'].includes(key))
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

async function resolveDriverId(currentUser) {
  if (!currentUser || currentUser.role !== 'driver') {
    return null
  }

  const currentAuthUserId = normalizeText(currentUser.auth_user_id)
  const candidateEmail = normalizeText(currentUser.email)

  if (currentAuthUserId) {
    const { data: userByAuthId, error: userByAuthIdError } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', currentAuthUserId)
      .eq('role', 'driver')
      .maybeSingle()

    if (!userByAuthIdError && userByAuthId?.id) {
      return userByAuthId.id
    }
  }

  if (currentUser.id) {
    const { data: userById, error: userByIdError } = await supabase
      .from('users')
      .select('id')
      .eq('id', currentUser.id)
      .eq('role', 'driver')
      .maybeSingle()

    if (!userByIdError && userById?.id) {
      return userById.id
    }
  }

  if (candidateEmail) {
    const { data: userByEmail, error: userByEmailError } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'driver')
      .ilike('email', candidateEmail)
      .maybeSingle()

    if (!userByEmailError && userByEmail?.id) {
      return userByEmail.id
    }
  }

  return null
}

async function invokeManageUsers(action, payload) {
  const { data, error } = await supabase.functions.invoke('manage-users', {
    body: {
      action,
      ...payload,
    },
  })

  if (error) {
    handleSupabaseError(error, 'Não foi possível concluir a operação.')
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
      handleSupabaseError(error, 'Não foi possível localizar o motorista.')
  }

  return data?.id ?? null
}

function toNullableNumber(value) {
  if (value === null || value === undefined || value === '') {
    return null
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function toNullableStringArray(value) {
  return Array.isArray(value) ? value : null
}

function buildStudentRecord(student, isUpdate = false) {
  const name = normalizeText(student.name)
  const address = normalizeText(student.address)
  const responsibleName = normalizeText(student.responsible_name)
  const parentContact = normalizeText(student.parent_contact)
  const transportIdentification = normalizeText(student.transport_identification)
  const unit = normalizeText(student.unit)
  const photoUrl = normalizeText(student.photo_url)

  const record = {
    name,
    nome: name,
    rm: normalizeText(student.rm),
    address,
    endereco: address,
    latitude: toNullableNumber(student.latitude),
    longitude: toNullableNumber(student.longitude),
    period: normalizeText(student.period),
    departure_time: normalizeText(student.departure_time),
    route_type: normalizeText(student.route_type),
    custom_route_days_departure: toNullableStringArray(student.custom_route_days_departure),
    custom_route_days_return: toNullableStringArray(student.custom_route_days_return),
    parent_contact: parentContact,
    contato_responsavel: parentContact,
    responsible_name: responsibleName,
    responsavel: responsibleName,
    transport_identification: transportIdentification,
    transporte: transportIdentification,
    unit,
    unidade: unit,
    photo_url: photoUrl || null,
    route_id: student.route_id ?? null,
    updated_at: new Date().toISOString(),
  }

  if (!isUpdate) {
    record.route_id = null
    record.created_at = new Date().toISOString()
  }

  return record
}

async function handleStudents(method, studentId, body) {
  const currentUser = getStoredUser()

  if (method === 'GET' && studentId) {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('id', studentId)
      .maybeSingle()

    if (error) {
      handleSupabaseError(error, 'Não foi possível localizar o aluno.')
    }

    return data
  }

  if (method === 'GET') {
    if (currentUser?.role === 'driver') {
      const driverId = await resolveDriverId(currentUser)
      if (!driverId) {
        return []
      }

      const [{ data: vehicleRoutes, error: vehicleRoutesError }, { data: vehicles, error: vehiclesError }] = await Promise.all([
        driverId ? supabase.from('routes').select('id, vehicle_id').eq('driver_id', driverId) : Promise.resolve({ data: [], error: null }),
        driverId ? supabase.from('vehicles').select('id').eq('driver_id', driverId) : Promise.resolve({ data: [], error: null }),
      ])

      if (vehicleRoutesError) {
        handleSupabaseError(vehicleRoutesError, 'Não foi possível carregar as rotas do motorista.')
      }
      if (vehiclesError) {
        handleSupabaseError(vehiclesError, 'Não foi possível carregar os veículos do motorista.')
      }

      const vehicleIds = Array.isArray(vehicles) ? vehicles.map((vehicle) => vehicle.id).filter(Boolean) : []
      const routeIdsFromDriver = Array.isArray(vehicleRoutes)
        ? vehicleRoutes.map((route) => route.id).filter(Boolean)
        : []

      const routeIds = new Set(routeIdsFromDriver)

      if (vehicleIds.length > 0) {
        const { data: vehicleRoutesByVehicle, error: vehicleRoutesByVehicleError } = await supabase
          .from('routes')
          .select('id')
          .in('vehicle_id', vehicleIds)

        if (vehicleRoutesByVehicleError) {
          handleSupabaseError(vehicleRoutesByVehicleError, 'Não foi possível carregar as rotas vinculadas aos veículos do motorista.')
        }

        for (const route of vehicleRoutesByVehicle ?? []) {
          if (route?.id) {
            routeIds.add(route.id)
          }
        }
      }

      if (routeIds.size === 0) {
        return []
      }

      const { data, error } = await supabase
        .from('students')
        .select('*')
        .in('route_id', Array.from(routeIds))
        .order('created_at', { ascending: false })

      if (error) {
        handleSupabaseError(error, 'Não foi possível carregar os alunos.')
      }

      return data ?? []
    }

    const { data, error } = await supabase
      .from('students')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      handleSupabaseError(error, 'Não foi possível carregar os alunos.')
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
      handleSupabaseError(error, 'Não foi possível cadastrar o aluno.')
    }

    return data
  }

  if (method === 'PUT' && studentId) {
    const payload = parseJsonBody(body)
    const { data: existingStudent, error: studentLookupError } = await supabase
      .from('students')
      .select('*')
      .eq('id', studentId)
      .maybeSingle()

    if (studentLookupError) {
      handleSupabaseError(studentLookupError, 'Não foi possível localizar o aluno.')
    }

    const mergedPayload = { ...(existingStudent || {}), ...payload }
    const targetRouteId = payload.route_id ?? mergedPayload.route_id ?? null

    if (payload.route_id !== undefined && payload.route_id !== null && existingStudent?.route_id && existingStudent.route_id !== targetRouteId) {
      throw new Error('Este aluno já está vinculado a outra rota.')
    }

    const { data, error } = await supabase.functions.invoke('manage-students', {
      body: {
        action: 'update_student',
        id: studentId,
        data: buildStudentRecord(mergedPayload, true),
      },
    })

    if (error) {
      handleSupabaseError(error, 'Não foi possível atualizar o aluno.')
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
      handleSupabaseError(error, 'Não foi possível excluir o aluno.')
    }

    return data
  }

  throw new Error('Operação de alunos não suportada.')
}

async function handleUsers(method, userType, userId, body) {
  if (method === 'GET' && userId) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (error) {
      handleSupabaseError(error, 'Não foi possível localizar o usuário.')
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
      handleSupabaseError(error, 'Não foi possível carregar os usuários.')
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

  throw new Error('Operação de usuários não suportada.')
}

async function handleContacts(method) {
  if (method !== 'GET') {
    throw new Error('Operacao de contatos nao suportada.')
  }

  const { data, error } = await supabase.functions.invoke('list-contacts')

  if (error) {
    handleSupabaseError(error, 'Não foi possível carregar os contatos.')
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

async function handleRoutes(method, body, routeId = null) {
  const currentUser = getStoredUser()

  if (method === 'POST') {
    const payload = parseJsonBody(body)
    const vehicleId = normalizeText(payload.vehicle_id)

    if (!vehicleId) {
      throw new Error('Informe o veículo para criar a rota.')
    }

    const { data, error } = await supabase
      .from('routes')
      .insert({
        vehicle_id: vehicleId,
        driver_id: payload.driver_id || null,
        status: normalizeText(payload.status) || 'Aguardando Saída',
        stops: Array.isArray(payload.stops) ? payload.stops : [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('*')
      .single()

    if (error) {
      handleSupabaseError(error, 'Não foi possível criar a rota.')
    }

    return data
  }

  if (method === 'PUT') {
    const payload = parseJsonBody(body)
    const stops = Array.isArray(payload.stops) ? payload.stops : []
    const studentIds = stops
      .map((stop) => stop?.student_id || stop?.id || stop?.studentId)
      .filter(Boolean)

    const routeUpdate = {
      status: normalizeText(payload.status) || 'Aguardando Saída',
      vehicle_id: payload.vehicle_id ?? null,
      driver_id: payload.driver_id ?? null,
      stops,
      updated_at: new Date().toISOString(),
    }

    const { data: routeData, error: routeError } = await supabase
      .from('routes')
      .update(routeUpdate)
      .eq('id', routeId)
      .select('*')
      .single()

    if (routeError) {
      handleSupabaseError(routeError, 'Não foi possível atualizar a rota.')
    }

    if (studentIds.length > 0) {
      const { error: clearStudentsError } = await supabase
        .from('students')
        .update({ route_id: null, updated_at: new Date().toISOString() })
        .eq('route_id', routeId)

      if (clearStudentsError) {
        handleSupabaseError(clearStudentsError, 'Não foi possível limpar a antiga vinculação de alunos.')
      }

      const { error: assignStudentsError } = await supabase
        .from('students')
        .update({ route_id: routeId, updated_at: new Date().toISOString() })
        .in('id', studentIds)

      if (assignStudentsError) {
        handleSupabaseError(assignStudentsError, 'Não foi possível vincular os alunos à rota.')
      }
    } else {
      const { error: clearStudentsError } = await supabase
        .from('students')
        .update({ route_id: null, updated_at: new Date().toISOString() })
        .eq('route_id', routeId)

      if (clearStudentsError) {
        handleSupabaseError(clearStudentsError, 'Não foi possível remover os alunos da rota.')
      }
    }

    return routeData
  }

  if (method === 'DELETE') {
    const { error: clearStudentsError } = await supabase
      .from('students')
      .update({ route_id: null, updated_at: new Date().toISOString() })
      .eq('route_id', routeId)

    if (clearStudentsError) {
      handleSupabaseError(clearStudentsError, 'Não foi possível remover os alunos da rota.')
    }

    const { error } = await supabase.from('routes').delete().eq('id', routeId)

    if (error) {
      handleSupabaseError(error, 'Não foi possível excluir a rota.')
    }

    return { message: 'Rota excluída com sucesso.' }
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
    handleSupabaseError(routesResponse.error, 'Não foi possível carregar as rotas.')
  }

  if (vehiclesResponse.error) {
    handleSupabaseError(vehiclesResponse.error, 'Não foi possível carregar os veículos.')
  }

  if (usersResponse.error) {
    handleSupabaseError(usersResponse.error, 'Não foi possível carregar os usuários.')
  }

  if (studentsResponse.error) {
    handleSupabaseError(studentsResponse.error, 'Não foi possível carregar os alunos.')
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
      vehicle_name: vehicle?.identification || vehicle?.model || vehicle?.license_plate || 'Veículo não informado',
      driver_id: route.driver_id,
      driver_name: driver?.full_name || vehicle?.driver_name || 'Motorista não informado',
      vehicle_driver_id: vehicle?.driver_id || null,
      status: route.status || 'Aguardando Saída',
      created_at: route.created_at,
      updated_at: route.updated_at,
      students,
    }
  })

  if (currentUser?.role === 'driver') {
    const currentDriverId = await resolveDriverId(currentUser) || currentUser.id
    const currentDriverName = normalizeName(currentUser.full_name)

    return routes.filter((route) => {
      const routeDriverName = normalizeName(route.driver_name)
      const vehicleDriverName = normalizeName(route.driver_name)

      return (
        route.driver_id === currentDriverId ||
        route.driver_id === currentUser.id ||
        route.vehicle_driver_id === currentDriverId ||
        route.vehicle_driver_id === currentUser.id ||
        (currentDriverName && (routeDriverName === currentDriverName || routeDriverName.includes(currentDriverName) || currentDriverName.includes(routeDriverName)))
      )
    })
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
      handleSupabaseError(error, 'Não foi possível localizar o veículo.')
    }

    return data
  }

  if (method === 'GET') {
    const currentUser = getStoredUser()
    const isDriver = currentUser?.role === 'driver'
    const driverId = isDriver ? await resolveDriverId(currentUser) : null
    const driverIds = isDriver && driverId ? [driverId] : []

    if (isDriver) {
      if (driverIds.length > 0) {
        const { data: directVehicles, error: directError } = await supabase
          .from('vehicles')
          .select('*')
          .in('driver_id', driverIds)
          .order('created_at', { ascending: false })
          .limit(1)

        if (directError) {
          handleSupabaseError(directError, 'Não foi possível carregar os veículos.')
        }

        if (Array.isArray(directVehicles) && directVehicles.length > 0) {
          return directVehicles
        }

        const { data: routeVehicles, error: routeError } = await supabase
          .from('routes')
          .select('vehicle_id')
          .in('driver_id', driverIds)

        if (routeError) {
          handleSupabaseError(routeError, 'Não foi possível carregar as rotas do motorista.')
        }

        const vehicleIds = Array.isArray(routeVehicles)
          ? routeVehicles.map((route) => route.vehicle_id).filter(Boolean)
          : []

        if (vehicleIds.length > 0) {
          const { data: vehiclesByRoute, error: routeVehicleError } = await supabase
            .from('vehicles')
            .select('*')
            .in('id', vehicleIds)
            .order('created_at', { ascending: false })
            .limit(1)

          if (routeVehicleError) {
            handleSupabaseError(routeVehicleError, 'Não foi possível carregar os veículos vinculados à rota do motorista.')
          }

          if (Array.isArray(vehiclesByRoute) && vehiclesByRoute.length > 0) {
            return vehiclesByRoute
          }
        }
      }

      return []
    }

    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      handleSupabaseError(error, 'Não foi possível carregar os veículos.')
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
      handleSupabaseError(error, 'Não foi possível cadastrar o veículo.')
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
      handleSupabaseError(error, 'Não foi possível atualizar o veículo.')
    }

    return data
  }

  if (method === 'DELETE' && vehicleId) {
    const { error } = await supabase
      .from('vehicles')
      .delete()
      .eq('id', vehicleId)

    if (error) {
      handleSupabaseError(error, 'Não foi possível excluir o veículo.')
    }

    return { message: 'Veiculo excluido com sucesso' }
  }

  throw new Error('Operação de veículos não suportada.')
}

export async function apiRequest(path, options = {}) {
  const method = (options.method || 'GET').toUpperCase()
  const segments = getPathSegments(path)
  const resource = segments[1]
  const itemId = segments[2] || null

  try {
    // Garante que a sessão do Supabase (restaurada a partir dos tokens salvos
    // pelo auth.js) já foi aplicada ao client antes de qualquer query. Sem
    // isso, requests disparadas logo no mount de um componente podem sair
    // sem autenticação e o RLS filtra tudo silenciosamente.
    await sessionReady

    if (segments[0] !== 'api') {
throw new Error(`Endpoint não suportado: ${path}`)
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
      return await handleRoutes(method, options.body, itemId)
    }

    throw new Error(`Endpoint nao suportado: ${path}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não foi possível concluir a solicitação.'

    if (message.toLowerCase().includes('jwt') || message.toLowerCase().includes('unauthorized')) {
      clearSession()
    }

    throw error instanceof Error ? error : new Error(message)
  }
}
// 
