// Edge Function: generate-routes
//
// Agrupa alunos sem rota (route_id IS NULL) nos veiculos disponiveis da mesma
// unidade, respeitando a capacidade de cada veiculo, e usa a Directions API do
// Google (optimizeWaypoints) para definir a melhor ordem de paradas.
//
// Cada rota criada representa o trajeto do dia inteiro do veiculo: a mesma
// ordem de paradas serve de guia pra ida (sai da unidade, visita as casas) e
// pra volta (mesma ordem, invertida).
//
// Alunos com route_type = "Personalizado" NAO sao incluidos automaticamente
// (precisam de atribuicao manual) porque o esquema atual nao guarda uma lista
// de paradas por dia da semana.
//
// Variaveis de ambiente necessarias (configurar via `supabase secrets set`):
//   SUPABASE_URL                 - preenchida automaticamente pelo Supabase
//   SUPABASE_SERVICE_ROLE_KEY    - preenchida automaticamente pelo Supabase
//   GOOGLE_DIRECTIONS_API_KEY    - chave do Google Maps restrita a Directions API
//                                  (NAO reutilize a VITE_GOOGLE_MAPS_API_KEY do
//                                  front-end, que e restrita por HTTP referrer)
//
// Verifique antes de usar: a coluna "capacity" na tabela vehicles precisa
// existir com esse nome exato. Se o nome for outro, ajuste as referencias
// abaixo (busque por `.capacity`).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
}

type Veiculo = {
  id: string
  unit: string
  driver_id: string | null
  capacity: number
}

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

// Clustering geografico com capacidade (variante simplificada de k-means balanceado).
// Processa primeiro os alunos "mais decididos" (mais perto do centroide mais
// proximo) pra reduzir alocacoes ruins feitas por ordem de chegada.
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
      const ordemVeiculos = distancias
        .map((d, i) => ({ i, d }))
        .sort((a, b) => a.d - b.d)

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

// Usa a Directions API (optimizeWaypoints) pra achar a melhor ordem de visita.
// Origem e destino sao a propria unidade (o trajeto e tratado como um loop:
// sai da unidade, visita as casas, volta pra unidade) - assim a mesma ordem
// serve pra ida e, invertida, pra volta.
async function otimizarOrdemParadas(enderecoUnidade: string, alunos: Aluno[], apiKey: string): Promise<Aluno[]> {
  if (alunos.length <= 1) {
    return alunos
  }

  const grupos: Aluno[][] = []
  for (let i = 0; i < alunos.length; i += MAX_WAYPOINTS) {
    grupos.push(alunos.slice(i, i + MAX_WAYPOINTS))
  }

  const resultado: Aluno[] = []

  for (const grupo of grupos) {
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
        resultado.push(...ordem.map((i) => grupo[i]))
      } else {
        console.error('Directions API retornou status', data.status, data.error_message)
        resultado.push(...grupo) // fallback: mantem a ordem original
      }
    } catch (error) {
      console.error('Erro ao chamar Directions API:', error)
      resultado.push(...grupo)
    }
  }

  return resultado
}

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

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const googleApiKey = Deno.env.get('GOOGLE_DIRECTIONS_API_KEY')

  if (!supabaseUrl || !supabaseServiceKey || !googleApiKey) {
    return new Response(
      JSON.stringify({
        error:
          'Variaveis de ambiente ausentes (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY ou GOOGLE_DIRECTIONS_API_KEY).',
      }),
      { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } },
    )
  }

  const adminCheck = await requireAdmin(req)
  if ('error' in adminCheck) {
    return new Response(
      JSON.stringify({ error: adminCheck.error }),
      { status: adminCheck.status, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } },
    )
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const [{ data: alunosData, error: erroAlunos }, { data: veiculosData, error: erroVeiculos }] = await Promise.all([
    supabase.from('students').select('*').is('route_id', null),
    supabase.from('vehicles').select('*'),
  ])

  if (erroAlunos || erroVeiculos) {
    return new Response(
      JSON.stringify({ error: (erroAlunos || erroVeiculos)?.message || 'Erro ao carregar dados.' }),
      { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } },
    )
  }

  const todosAlunos = (alunosData || []) as Aluno[]
  const todosVeiculos = (veiculosData || []) as Veiculo[]

  const alunosPersonalizados = todosAlunos.filter((a) => a.route_type === 'Personalizado')
  const alunosSemCoordenada = todosAlunos.filter((a) => a.latitude == null || a.longitude == null)
  const alunosElegiveis = todosAlunos.filter(
    (a) => a.latitude != null && a.longitude != null && a.unit && a.route_type && a.route_type !== 'Personalizado',
  )

  // Agrupa por unidade + periodo + horario de saida (um veiculo so pode estar
  // num lugar por vez, entao esses tres campos juntos definem quem PODE
  // dividir o mesmo veiculo)
  const grupos = new Map<string, Aluno[]>()
  for (const aluno of alunosElegiveis) {
    const chave = `${aluno.unit}|${aluno.period || ''}|${aluno.departure_time || ''}`
    const lista = grupos.get(chave) || []
    lista.push(aluno)
    grupos.set(chave, lista)
  }

  const resumo = {
    rotasCriadas: 0,
    alunosAlocados: 0,
    alunosSemVeiculo: [] as string[],
    alunosSemCoordenada: alunosSemCoordenada.map((a) => a.name),
    alunosPersonalizados: alunosPersonalizados.map((a) => a.name),
  }

  for (const [chave, alunosDoGrupo] of grupos) {
    const [unidade, periodo, horario] = chave.split('|')
    const enderecoUnidade = UNIT_ADDRESSES[unidade]

    if (!enderecoUnidade) {
      console.error(`Unidade "${unidade}" nao tem endereco cadastrado em UNIT_ADDRESSES.`)
      resumo.alunosSemVeiculo.push(...alunosDoGrupo.map((a) => a.name))
      continue
    }

    const veiculosDaUnidade = todosVeiculos.filter((v) => v.unit === unidade && v.capacity > 0)

    if (veiculosDaUnidade.length === 0) {
      resumo.alunosSemVeiculo.push(...alunosDoGrupo.map((a) => a.name))
      continue
    }

    const { clusters, sobrando } = clusterizarAlunos(alunosDoGrupo, veiculosDaUnidade)
    resumo.alunosSemVeiculo.push(...sobrando.map((a) => a.name))

    for (let i = 0; i < veiculosDaUnidade.length; i++) {
      const alunosDoVeiculo = clusters[i]
      if (alunosDoVeiculo.length === 0) {
        continue
      }

      const ordemOtimizada = await otimizarOrdemParadas(enderecoUnidade, alunosDoVeiculo, googleApiKey)

      const { data: novaRota, error: erroRota } = await supabase
        .from('routes')
        .insert({
          vehicle_id: veiculosDaUnidade[i].id,
          driver_id: veiculosDaUnidade[i].driver_id,
          horario: `${periodo} - ${horario}`.trim(),
          status: 'Aguardando Saida',
          stops: ordemOtimizada.map((aluno, index) => ({
            student_id: aluno.id,
            student_name: aluno.name,
            address: aluno.address,
            order: index + 1,
          })),
        })
        .select()
        .single()

      if (erroRota || !novaRota) {
        console.error('Erro ao criar rota:', erroRota)
        resumo.alunosSemVeiculo.push(...alunosDoVeiculo.map((a) => a.name))
        continue
      }

      resumo.rotasCriadas += 1

      const idsAlunos = alunosDoVeiculo.map((a) => a.id)
      const { error: erroUpdate } = await supabase.from('students').update({ route_id: novaRota.id }).in('id', idsAlunos)

      if (erroUpdate) {
        console.error('Erro ao vincular alunos a rota:', erroUpdate)
        resumo.alunosSemVeiculo.push(...alunosDoVeiculo.map((a) => a.name))
      } else {
        resumo.alunosAlocados += alunosDoVeiculo.length
      }
    }
  }

  return new Response(JSON.stringify(resumo), {
    headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
  })
})
