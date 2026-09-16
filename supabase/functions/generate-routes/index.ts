// Edge Function: generate-routes
//
// Gera rotas separadas de IDA e VOLTA pros alunos ainda sem rota, respeitando
// a capacidade de cada veiculo, usando a Directions API do Google
// (optimizeWaypoints) pra definir a melhor ordem de paradas.
//
// - Rota de IDA: alunos com route_type "Ida" ou "Ida e volta". O horario de
//   inicio e calculado de tras pra frente a partir de um horario-alvo de
//   chegada por periodo (HORARIO_CHEGADA_IDA), usando a duracao real do
//   trajeto (Directions API).
// - Rota de VOLTA: alunos com route_type "Volta" ou "Ida e volta". O horario
//   de inicio e o proprio departure_time do aluno (ja e o horario de saida
//   da unidade, nao precisa de calculo).
//
// Um aluno "Ida e volta" pode ficar vinculado a DUAS rotas diferentes ao
// mesmo tempo (students.route_id_ida e students.route_id_volta sao colunas
// separadas - rode a migracao adicionar_rotas_ida_volta.sql antes de usar
// esta versao).
//
// Alunos com route_type = "Personalizado" NAO sao incluidos automaticamente
// (precisam de atribuicao manual) porque o esquema atual nao guarda uma lista
// de paradas por dia da semana.
//
// Variaveis de ambiente necessarias (configurar via `supabase secrets set`):
//   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY - automaticas
//   GOOGLE_DIRECTIONS_API_KEY - chave do Google Maps restrita a Directions API
//
// Verifique antes de usar: a coluna "capacity" na tabela vehicles precisa
// existir com esse nome exato.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const googleApiKey = Deno.env.get('GOOGLE_DIRECTIONS_API_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

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
    ...corsHeaders,
    'Access-Control-Allow-Origin': allowOrigin,
    'Vary': 'Origin',
    'Access-Control-Allow-Credentials': 'true',
  }
}

const UNIT_ADDRESSES: Record<string, string> = {
  'Garcia': 'R. Antônio Ferreira Laranja, 57 - Jardim Garcia, Campinas - SP, 13061-090',
  'Vila Mimosa': 'R. das Gardênias, 90 - Vila Mimosa, Campinas - SP, 13050-051',
  'Swiss Park': 'Av. Dermival Bernardes Siqueira, 2026 - Swiss Park, Campinas - SP, 13049-252',
  'Vivendo e Aprendendo': 'R. Castelnuovo, 760 - Jardim Garcia, Campinas - SP, 13061-085',
}

// Horario-alvo de chegada na unidade pras rotas de IDA, por periodo.
// Nao existe periodo Integral nesta escola, entao nao entra aqui.
const HORARIO_CHEGADA_IDA: Record<string, string> = {
  'Manhã': '07:05',
  'Tarde': '12:45',
}

const MAX_ITERATIONS = 8
// Deixa margem de seguranca abaixo do limite de 25 waypoints por requisicao da Directions API
const MAX_WAYPOINTS = 23

type Aluno = {
  id: string
  name: string
  address: string
  latitude: number
  longitude: number
  unit: string
  period: string | null
  departure_time: string | null
  route_type: string | null
  route_id_ida: string | null
  route_id_volta: string | null
}

type Veiculo = {
  id: string
  unit: string
  driver_id: string | null
  capacity: number
}

// ---------- utilidades de horario ----------

function horaParaMinutos(hora: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hora.trim())
  if (!match) return null
  const h = Number(match[1])
  const m = Number(match[2])
  if (Number.isNaN(h) || Number.isNaN(m)) return null
  return h * 60 + m
}

function minutosParaHora(minutos: number): string {
  const total = ((Math.round(minutos) % 1440) + 1440) % 1440
  const h = Math.floor(total / 60)
  const m = total % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

// ---------- geografia / clustering ----------

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371
  const toRad = (v: number) => (v * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function normalizarUnidade(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

// Clustering geografico com capacidade (variante simplificada de k-means balanceado).
function clusterizarAlunos(alunos: Aluno[], veiculos: Veiculo[]) {
  if (veiculos.length === 0) {
    return { clusters: [] as Aluno[][], sobrando: alunos }
  }

  const ordenadosPorLatitude = [...alunos].sort((a, b) => a.latitude - b.latitude)
  let centroides = veiculos.map((_, i) => {
    const idx = Math.floor((i * ordenadosPorLatitude.length) / veiculos.length)
    const semente = ordenadosPorLatitude[Math.min(idx, ordenadosPorLatitude.length - 1)]
    return semente ? { lat: semente.latitude, lng: semente.longitude } : { lat: 0, lng: 0 }
  })

  let clusters: Aluno[][] = veiculos.map(() => [])
  let sobrando: Aluno[] = []

  for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
    clusters = veiculos.map(() => [])
    sobrando = []

    const comDistancias = alunos.map((aluno) => {
      const distancias = centroides.map((c) => haversineKm(aluno.latitude, aluno.longitude, c.lat, c.lng))
      return { aluno, distancias, menorDistancia: Math.min(...distancias) }
    })
    comDistancias.sort((a, b) => a.menorDistancia - b.menorDistancia)

    for (const { aluno, distancias } of comDistancias) {
      const ordemVeiculos = distancias.map((d, i) => ({ i, d })).sort((a, b) => a.d - b.d)

      let alocado = false
      for (const { i } of ordemVeiculos) {
        if (clusters[i].length < veiculos[i].capacity) {
          clusters[i].push(aluno)
          alocado = true
          break
        }
      }
      if (!alocado) {
        sobrando.push(aluno)
      }
    }

    centroides = clusters.map((grupo, i) => {
      if (grupo.length === 0) return centroides[i]
      const lat = grupo.reduce((acc, a) => acc + a.latitude, 0) / grupo.length
      const lng = grupo.reduce((acc, a) => acc + a.longitude, 0) / grupo.length
      return { lat, lng }
    })
  }

  return { clusters, sobrando }
}

// ---------- auth ----------

function createUserClient(request: Request) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: request.headers.get('Authorization') ?? '' } },
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  })
}

function createAdminClient() {
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
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

// ---------- Directions API ----------

// Traca o loop unidade -> paradas (na melhor ordem) -> unidade, e devolve a
// ordem otimizada junto com a duracao total do trajeto (soma de todas as
// pernas). Usado tanto pra IDA (ordem + duracao, pra calcular horario de
// inicio) quanto pra VOLTA (so a ordem interessa).
//
// Nota: quando ha mais de MAX_WAYPOINTS alunos, a lista e dividida em varios
// pedidos e a duracao de cada pedido e somada. Isso super-estima levemente a
// duracao real (cada pedido soma sua propria volta ate a unidade), mas para
// rotas de ate ~23 alunos (o normal pra uma van escolar) e sempre uma unica
// requisicao, entao o calculo e exato.
async function tracarRota(enderecoUnidade: string, alunos: Aluno[], apiKey: string) {
  if (alunos.length === 0) {
    return { ordenados: [] as Aluno[], duracaoSegundos: 0 }
  }

  const grupos: Aluno[][] = []
  for (let i = 0; i < alunos.length; i += MAX_WAYPOINTS) {
    grupos.push(alunos.slice(i, i + MAX_WAYPOINTS))
  }

  const ordenados: Aluno[] = []
  let duracaoSegundos = 0

  for (const grupo of grupos) {
    if (grupo.length === 1) {
      // Sem waypoints intermediarios pra otimizar, mas ainda precisamos da
      // duracao (ida + volta ate a unidade).
      const url =
        'https://maps.googleapis.com/maps/api/directions/json' +
        `?origin=${encodeURIComponent(enderecoUnidade)}` +
        `&destination=${encodeURIComponent(enderecoUnidade)}` +
        `&waypoints=${encodeURIComponent(grupo[0].address)}` +
        `&key=${apiKey}`

      try {
        const res = await fetch(url)
        const data = await res.json()
        if (data.status === 'OK' && data.routes?.[0]?.legs) {
          duracaoSegundos += data.routes[0].legs.reduce(
            (acc: number, leg: { duration?: { value?: number } }) => acc + (leg.duration?.value ?? 0),
            0,
          )
        } else {
          console.error('Directions API retornou status', data.status, data.error_message)
        }
      } catch (error) {
        console.error('Erro ao chamar Directions API:', error)
      }

      ordenados.push(grupo[0])
      continue
    }

    const waypoints = grupo.map((a) => encodeURIComponent(a.address)).join('|')
    const url =
      'https://maps.googleapis.com/maps/api/directions/json' +
      `?origin=${encodeURIComponent(enderecoUnidade)}` +
      `&destination=${encodeURIComponent(enderecoUnidade)}` +
      `&waypoints=optimize:true|${waypoints}` +
      `&key=${apiKey}`

    try {
      const res = await fetch(url)
      const data = await res.json()

      if (data.status === 'OK' && data.routes?.[0]?.waypoint_order) {
        const ordem: number[] = data.routes[0].waypoint_order
        ordenados.push(...ordem.map((i) => grupo[i]))
        duracaoSegundos += (data.routes[0].legs ?? []).reduce(
          (acc: number, leg: { duration?: { value?: number } }) => acc + (leg.duration?.value ?? 0),
          0,
        )
      } else {
        console.error('Directions API retornou status', data.status, data.error_message)
        ordenados.push(...grupo)
      }
    } catch (error) {
      console.error('Erro ao chamar Directions API:', error)
      ordenados.push(...grupo)
    }
  }

  return { ordenados, duracaoSegundos }
}

// ---------- handler principal ----------

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(req) })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Metodo nao permitido.' }), {
      status: 405,
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    })
  }

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey || !googleApiKey) {
    return new Response(
      JSON.stringify({ error: 'Variaveis de ambiente ausentes.' }),
      { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } },
    )
  }

  const adminCheck = await requireAdmin(req)
  if ('error' in adminCheck) {
    return new Response(JSON.stringify({ error: adminCheck.error }), {
      status: adminCheck.status,
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    })
  }

  const supabase = createAdminClient()

  const [
    { data: alunosData, error: erroAlunos },
    { data: veiculosData, error: erroVeiculos },
    { data: rotasData, error: erroRotas },
  ] = await Promise.all([
    supabase.from('students').select('*'),
    supabase.from('vehicles').select('*'),
    supabase.from('routes').select('*').eq('status', 'Aguardando Saida'),
  ])

  if (erroAlunos || erroVeiculos || erroRotas) {
    return new Response(
      JSON.stringify({ error: (erroAlunos || erroVeiculos || erroRotas)?.message || 'Erro ao carregar dados.' }),
      { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } },
    )
  }

  const rotasExistentes = rotasData || []

  const todosAlunos = (alunosData || []) as Aluno[]
  const todosVeiculos = (veiculosData || []).map((v: Record<string, unknown>) => ({
    ...v,
    capacity: Number(v.capacity) || 0,
  })) as Veiculo[]

  const alunosSemCoordenada = todosAlunos.filter((a) => a.latitude == null || a.longitude == null)
  const alunosPersonalizados = todosAlunos.filter((a) => a.route_type === 'Personalizado')
  const alunosSemConfiguracaoRota = todosAlunos.filter((a) => {
    if (a.latitude == null || a.longitude == null || a.route_type === 'Personalizado') {
      return false
    }

    if (!a.unit || !a.period || !a.route_type) {
      return true
    }

    // departure_time so e exigido de quem realmente sai da unidade a
    // tarde (Volta ou Ida e volta) - quem e Ida pura nao precisa desse
    // campo, o horario dela vem de HORARIO_CHEGADA_IDA.
    const precisaDeDepartureTime = a.route_type === 'Volta' || a.route_type === 'Ida e volta'
    return precisaDeDepartureTime && !a.departure_time
  })

  const temDadosCompletosIda = (a: Aluno) => a.latitude != null && a.longitude != null && a.unit && a.period

  const temDadosCompletosVolta = (a: Aluno) =>
    a.latitude != null && a.longitude != null && a.unit && a.period && a.departure_time

  const resumo = {
    rotasCriadas: 0,
    rotasIda: 0,
    rotasVolta: 0,
    alunosAlocados: 0,
    alunosSemVeiculo: [] as string[],
    alunosSemVeiculoDaUnidade: [] as string[],
    alunosSemEnderecoDaUnidade: [] as string[],
    alunosSemCoordenada: alunosSemCoordenada.map((a) => a.name),
    alunosPersonalizados: alunosPersonalizados.map((a) => a.name),
    alunosSemConfiguracaoRota: alunosSemConfiguracaoRota.map((a) => a.name),
  }

  // Processa uma direcao (Ida ou Volta) por completo: agrupa, clusteriza,
  // traca a rota e grava no banco.
  async function processarDirecao(direcao: 'Ida' | 'Volta', elegiveis: Aluno[]) {
    const grupos = new Map<string, Aluno[]>()
    for (const aluno of elegiveis) {
      // Pra Ida, so unidade+periodo importam (todo mundo que chega no mesmo
      // horario da manha pode dividir o mesmo veiculo, independente do
      // horario de saida individual de cada um a tarde). Pra Volta, o
      // horario de saida E o que define quem sai junto.
      const chave =
        direcao === 'Ida'
          ? `${normalizarUnidade(aluno.unit)}|${aluno.period || ''}`
          : `${normalizarUnidade(aluno.unit)}|${aluno.period || ''}|${aluno.departure_time || ''}`
      const lista = grupos.get(chave) || []
      lista.push(aluno)
      grupos.set(chave, lista)
    }

    for (const [chave, alunosDoGrupo] of grupos) {
      const [unidade, periodo, horarioSaidaBruto] = chave.split('|')
      const horarioSaida = direcao === 'Volta' ? horarioSaidaBruto : ''
      const enderecoUnidade = UNIT_ADDRESSES[unidade]

      if (!enderecoUnidade) {
        console.error(`Unidade "${unidade}" nao tem endereco cadastrado em UNIT_ADDRESSES.`)
        resumo.alunosSemEnderecoDaUnidade.push(...alunosDoGrupo.map((a) => a.name))
        continue
      }

      const veiculosDaUnidade = todosVeiculos.filter((v) => normalizarUnidade(v.unit) === unidade && v.capacity > 0)

      if (veiculosDaUnidade.length === 0) {
        console.error(`Nenhum veiculo com capacidade > 0 para a unidade "${unidade}".`)
        resumo.alunosSemVeiculoDaUnidade.push(...alunosDoGrupo.map((a) => a.name))
        continue
      }

      // Rotas do mesmo grupo (mesmo veiculo + direcao + periodo + horario)
      // que ja existem e ainda nao saíram - tem prioridade sobre criar rota
      // nova: primeiro completa a vaga que sobrou nelas.
      const rotaExistentePorVeiculo = new Map(
        rotasExistentes
          .filter(
            (r: any) =>
              r.direction === direcao &&
              r.period === periodo &&
              (direcao === 'Volta' ? r.departure_time === horarioSaida : true),
          )
          .map((r: any) => [r.vehicle_id, r]),
      )

      const veiculosComCapacidadeRestante = veiculosDaUnidade.map((v) => {
        const rotaExistente = rotaExistentePorVeiculo.get(v.id)
        const jaOcupado = rotaExistente ? (rotaExistente.stops || []).length : 0
        return { ...v, capacity: Math.max(0, v.capacity - jaOcupado) }
      })

      const veiculosDisponiveis = veiculosComCapacidadeRestante.filter((v) => v.capacity > 0)

      if (veiculosDisponiveis.length === 0) {
        resumo.alunosSemVeiculoDaUnidade.push(...alunosDoGrupo.map((a) => a.name))
        continue
      }

      const { clusters, sobrando } = clusterizarAlunos(alunosDoGrupo, veiculosDisponiveis)
      resumo.alunosSemVeiculo.push(...sobrando.map((a) => a.name))

      for (let i = 0; i < veiculosDisponiveis.length; i++) {
        const alunosNovosDoVeiculo = clusters[i]
        if (alunosNovosDoVeiculo.length === 0) {
          continue
        }

        const veiculo = veiculosDisponiveis[i]
        const rotaExistente = rotaExistentePorVeiculo.get(veiculo.id) as any

        // Se ja existe rota pra esse veiculo/grupo, junta quem ja estava
        // nela com os alunos novos e retraca a ordem toda (nao so anexa no
        // final - reotimiza com todo mundo junto).
        const alunosJaNaRota: Aluno[] = rotaExistente
          ? ((rotaExistente.stops || [])
              .map((s: any) => todosAlunos.find((a) => a.id === s.student_id))
              .filter(Boolean) as Aluno[])
          : []

        const todosOsAlunosDaRota = [...alunosJaNaRota, ...alunosNovosDoVeiculo]

        const { ordenados, duracaoSegundos } = await tracarRota(enderecoUnidade, todosOsAlunosDaRota, googleApiKey)

        let horarioInicio: string | null = null
        if (direcao === 'Ida') {
          const chegadaAlvo = HORARIO_CHEGADA_IDA[periodo]
          const minutosChegada = chegadaAlvo ? horaParaMinutos(chegadaAlvo) : null
          if (minutosChegada != null) {
            horarioInicio = minutosParaHora(minutosChegada - duracaoSegundos / 60)
          }
        } else {
          horarioInicio = horarioSaida || null
        }

        const horarioLabel =
          direcao === 'Volta'
            ? `${periodo} - ${horarioSaida}`.trim()
            : `${periodo}${horarioInicio ? ` - ${horarioInicio}` : ''}`.trim()

        const stopsAtualizados = ordenados.map((aluno, index) => ({
          student_id: aluno.id,
          student_name: aluno.name,
          address: aluno.address,
          order: index + 1,
        }))

        let rotaId: string

        if (rotaExistente) {
          const { error: erroUpdateRota } = await supabase
            .from('routes')
            .update({ stops: stopsAtualizados, horario_inicio: horarioInicio, horario: horarioLabel })
            .eq('id', rotaExistente.id)

          if (erroUpdateRota) {
            console.error('Erro ao atualizar rota existente:', erroUpdateRota)
            resumo.alunosSemVeiculo.push(...alunosNovosDoVeiculo.map((a) => a.name))
            continue
          }

          rotaId = rotaExistente.id
        } else {
          const { data: novaRota, error: erroRota } = await supabase
            .from('routes')
            .insert({
              vehicle_id: veiculo.id,
              driver_id: veiculo.driver_id,
              direction: direcao,
              period: periodo,
              departure_time: direcao === 'Volta' ? horarioSaida : null,
              horario: horarioLabel,
              horario_inicio: horarioInicio,
              status: 'Aguardando Saida',
              stops: stopsAtualizados,
            })
            .select()
            .single()

          if (erroRota || !novaRota) {
            console.error('Erro ao criar rota:', erroRota)
            resumo.alunosSemVeiculo.push(...alunosNovosDoVeiculo.map((a) => a.name))
            continue
          }

          rotaId = novaRota.id
          resumo.rotasCriadas += 1
          if (direcao === 'Ida') resumo.rotasIda += 1
          else resumo.rotasVolta += 1
        }

        const idsAlunosNovos = alunosNovosDoVeiculo.map((a) => a.id)
        const coluna = direcao === 'Ida' ? 'route_id_ida' : 'route_id_volta'
        const { error: erroUpdate } = await supabase
          .from('students')
          .update({ [coluna]: rotaId })
          .in('id', idsAlunosNovos)

        if (erroUpdate) {
          console.error('Erro ao vincular alunos a rota:', erroUpdate)
          resumo.alunosSemVeiculo.push(...alunosNovosDoVeiculo.map((a) => a.name))
        } else {
          resumo.alunosAlocados += alunosNovosDoVeiculo.length
        }
      }
    }
  }

  const elegiveisIda = todosAlunos.filter(
    (a) =>
      temDadosCompletosIda(a) &&
      a.route_type !== 'Personalizado' &&
      (a.route_type === 'Ida' || a.route_type === 'Ida e volta') &&
      !a.route_id_ida,
  )

  const elegiveisVolta = todosAlunos.filter(
    (a) =>
      temDadosCompletosVolta(a) &&
      a.route_type !== 'Personalizado' &&
      (a.route_type === 'Volta' || a.route_type === 'Ida e volta') &&
      !a.route_id_volta,
  )

  await processarDirecao('Ida', elegiveisIda)
  await processarDirecao('Volta', elegiveisVolta)

  return new Response(JSON.stringify(resumo), {
    headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
  })
})