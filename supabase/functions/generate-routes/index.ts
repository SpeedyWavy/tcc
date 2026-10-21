// Edge Function: generate-routes
//
// Gera rotas separadas de IDA e VOLTA pros alunos ainda sem rota, respeitando
// a capacidade de cada veiculo, usando a Directions API do Google
// (optimizeWaypoints) pra definir a melhor ordem de paradas.
//
// - Rota de IDA: alunos com route_type "Ida" ou "Ida e volta". Comeca SEMPRE
//   pelo aluno que mora mais LONGE da unidade (e nao pelo mais proximo -
//   e assim que esse colegio faz de verdade: o van sai do endereco mais
//   distante e vai se aproximando da escola a cada parada). So a ordem das
//   paradas restantes, entre o aluno mais distante e a unidade, e otimizada
//   pela Directions API. O horario de inicio e calculado de tras pra frente
//   a partir de um horario-alvo de chegada por periodo (HORARIO_CHEGADA_IDA),
//   usando a duracao real desse trajeto (ponto mais distante -> unidade).
// - Rota de VOLTA: alunos com route_type "Volta" ou "Ida e volta". O horario
//   de inicio e o proprio departure_time do aluno (ja e o horario de saida
//   da unidade, nao precisa de calculo). A ordem das paradas continua sendo
//   otimizada livremente pela Directions API (unidade -> paradas -> unidade),
//   sem ponto de partida fixo - se precisar do mesmo comportamento "sempre
//   comeca pelo mais distante" tambem na Volta, e so pedir.
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

// Passo de refinamento rodado DEPOIS que o k-means balanceado (abaixo) ja
// estabilizou. O problema que ele resolve: a atribuicao do k-means e gulosa
// e processa os alunos em uma ordem global (do mais "decidido" pro mais
// "indeciso"), entao, quando a capacidade de um veiculo aperta, um aluno de
// uma regiao pode acabar ocupando a ultima vaga de um veiculo que era, na
// verdade, o mais perto de um aluno de OUTRA regiao - empurrando esse
// segundo aluno pra um veiculo mais longe, e fatiando um grupo que deveria
// ficar inteiro no mesmo veiculo.
//
// A correcao e uma busca local simples (2-opt): procura, entre todo par de
// alunos em veiculos DIFERENTES, uma troca de veiculo que diminua a soma
// das distancias de ambos ate o centroide do veiculo onde cada um fica.
// Troca sempre que encontra uma melhora, repete ate nao achar mais nenhuma
// (ou bater o limite de seguranca) - a capacidade de cada veiculo nunca
// muda, porque e sempre uma troca 1-por-1 entre dois veiculos.
function refinarClustersComTrocas(
  clusters: Aluno[][],
  centroides: Array<{ lat: number; lng: number }>,
  limiteTrocas = 2000,
) {
  let trocas = 0
  let melhorou = true

  while (melhorou && trocas < limiteTrocas) {
    melhorou = false

    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        for (let a = 0; a < clusters[i].length; a++) {
          for (let b = 0; b < clusters[j].length; b++) {
            const alunoA = clusters[i][a]
            const alunoB = clusters[j][b]

            const distanciaAtual =
              haversineKm(alunoA.latitude, alunoA.longitude, centroides[i].lat, centroides[i].lng) +
              haversineKm(alunoB.latitude, alunoB.longitude, centroides[j].lat, centroides[j].lng)

            const distanciaTrocada =
              haversineKm(alunoB.latitude, alunoB.longitude, centroides[i].lat, centroides[i].lng) +
              haversineKm(alunoA.latitude, alunoA.longitude, centroides[j].lat, centroides[j].lng)

            // Margem pequena (10 metros) pra nao ficar trocando por causa de
            // arredondamento de ponto flutuante.
            if (distanciaTrocada < distanciaAtual - 0.01) {
              clusters[i][a] = alunoB
              clusters[j][b] = alunoA
              melhorou = true
              trocas++
            }
          }
        }
      }
    }
  }
}

// Escolhe sementes iniciais bem espalhadas pelo mapa (tecnica tipo
// "k-means++"/farthest-point sampling): comeca pelo aluno mais a
// sudoeste (ponto de partida deterministico, nao aleatorio) e, a cada
// passo, escolhe o aluno cuja MENOR distancia ate qualquer semente ja
// escolhida e a MAIOR possivel - ou seja, sempre pula pro "buraco" mais
// vazio do mapa que ainda nao tem semente por perto. Isso separa regioes
// discretas bem melhor do que ordenar só por latitude (que ignora a
// longitude e pode colocar duas sementes na mesma regiao enquanto outra
// regiao inteira fica sem nenhuma).
function semearPorDistanciaMaxima(alunos: Aluno[], quantos: number) {
  if (alunos.length === 0 || quantos <= 0) {
    return [] as Array<{ lat: number; lng: number }>
  }

  const sementes: Aluno[] = []
  let primeira = alunos[0]
  for (const aluno of alunos) {
    if (aluno.latitude + aluno.longitude < primeira.latitude + primeira.longitude) {
      primeira = aluno
    }
  }
  sementes.push(primeira)

  while (sementes.length < quantos && sementes.length < alunos.length) {
    let melhorAluno: Aluno | null = null
    let melhorDistancia = -1

    for (const aluno of alunos) {
      let distanciaMinima = Infinity
      for (const semente of sementes) {
        const distancia = haversineKm(aluno.latitude, aluno.longitude, semente.latitude, semente.longitude)
        if (distancia < distanciaMinima) {
          distanciaMinima = distancia
        }
      }
      if (distanciaMinima > melhorDistancia) {
        melhorDistancia = distanciaMinima
        melhorAluno = aluno
      }
    }

    if (!melhorAluno) {
      break
    }
    sementes.push(melhorAluno)
  }

  return sementes.map((a) => ({ lat: a.latitude, lng: a.longitude }))
}

// Clustering geografico com capacidade (variante simplificada de k-means balanceado).
//
// "centroidesIniciais" (opcional, alinhado por indice com "veiculos") e o
// que da estabilidade entre execucoes: quando um veiculo ja tem alunos
// alocados nessa mesma rota (de uma geracao anterior), passamos a posicao
// media deles como centroide FIXO desse veiculo. Isso faz os alunos novos
// serem puxados pra perto de quem ja esta la, em vez de "vazarem" pra
// qualquer veiculo que ainda tenha vaga sobrando, mesmo que seja longe -
// o alvo e que um aluno so va pra um veiculo diferente do que seus colegas
// de regiao quando a capacidade realmente obrigar. Um veiculo sem ancora
// (ainda vazio nessa rota) usa uma semente escolhida por
// semearPorDistanciaMaxima, pra comecar ja bem separado dos outros
// veiculos, e seu centroide continua sendo recalculado a cada iteracao.
function clusterizarAlunos(
  alunos: Aluno[],
  veiculos: Veiculo[],
  centroidesIniciais: Array<{ lat: number; lng: number } | null> = [],
) {
  if (veiculos.length === 0) {
    return { clusters: [] as Aluno[][], sobrando: alunos }
  }

  const indicesSemAncora = veiculos.map((_, i) => i).filter((i) => !centroidesIniciais[i])
  const sementesSemAncora = semearPorDistanciaMaxima(alunos, indicesSemAncora.length)

  let centroides: Array<{ lat: number; lng: number }> = veiculos.map((_, i) => centroidesIniciais[i] || { lat: 0, lng: 0 })
  let proximaSemente = 0
  for (const i of indicesSemAncora) {
    centroides[i] = sementesSemAncora[proximaSemente] ?? { lat: 0, lng: 0 }
    proximaSemente += 1
  }

  // FASE 1 - usa uma capacidade "alvo" em vez da capacidade real de cada
  // veiculo. Sem isso, um veiculo com capacidade bem maior que os outros
  // (um onibus entre varias vans, ou um veiculo central com muita vaga)
  // vira um "aspirador": quando os vizinhos menores enchem, ele e sempre o
  // veiculo com vaga mais proximo e acaba pegando alunos de varias regioes
  // diferentes, virando uma rota gigante enquanto os outros ficam com
  // poucos alunos. O alvo divide a demanda dessa rodada igualmente entre os
  // veiculos disponiveis (arredondando pra cima), respeitando o limite real.
  const capacidadeAlvo = Math.max(1, Math.ceil(alunos.length / veiculos.length))
  const capacidadesFase1 = veiculos.map((v) => Math.min(v.capacity, capacidadeAlvo))

  const recalcularCentroides = (grupos: Aluno[][], atuais: Array<{ lat: number; lng: number }>) =>
    grupos.map((grupo, i) => {
      // Veiculo com ancora (ja tinha alunos nessa rota) mantem o centroide
      // fixo na posicao deles, em vez de derivar pra longe ao longo das
      // iteracoes por causa dos alunos novos que forem entrando no grupo.
      const ancora = centroidesIniciais[i]
      if (ancora) {
        return ancora
      }
      if (grupo.length === 0) return atuais[i]
      const lat = grupo.reduce((acc, a) => acc + a.latitude, 0) / grupo.length
      const lng = grupo.reduce((acc, a) => acc + a.longitude, 0) / grupo.length
      return { lat, lng }
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
        if (clusters[i].length < capacidadesFase1[i]) {
          clusters[i].push(aluno)
          alocado = true
          break
        }
      }
      if (!alocado) {
        sobrando.push(aluno)
      }
    }

    centroides = recalcularCentroides(clusters, centroides)
  }

  // FASE 2 - quem nao coube na capacidade-alvo usa agora a capacidade REAL
  // de cada veiculo (a folga que sobrou), sempre indo pro veiculo mais
  // proximo que ainda tiver vaga de verdade. Um aluno de uma regiao grande
  // tende a voltar pro mesmo veiculo da regiao (que e o mais proximo) se
  // ele ainda tiver vaga; so vai pra outro veiculo quando a capacidade real
  // daquele acabou. Os mais proximos de algum veiculo sao colocados antes.
  if (sobrando.length > 0) {
    const pendentes = sobrando
      .map((aluno) => {
        const distancias = centroides.map((c) => haversineKm(aluno.latitude, aluno.longitude, c.lat, c.lng))
        return { aluno, distancias, menorDistancia: Math.min(...distancias) }
      })
      .sort((a, b) => a.menorDistancia - b.menorDistancia)

    const aindaSemVeiculo: Aluno[] = []

    for (const { aluno, distancias } of pendentes) {
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
        aindaSemVeiculo.push(aluno)
      }
    }

    sobrando = aindaSemVeiculo
    centroides = recalcularCentroides(clusters, centroides)
  }

  // O k-means guloso acima as vezes fatia um grupo geografico entre dois
  // veiculos vizinhos so por causa da ordem em que os alunos foram
  // processados - o refinamento por troca (2-opt) corrige esses casos sem
  // violar a capacidade de ninguem. Duas rodadas: a segunda recalcula os
  // centroides com a composicao ja corrigida pela primeira.
  refinarClustersComTrocas(clusters, centroides)
  centroides = recalcularCentroides(clusters, centroides)
  refinarClustersComTrocas(clusters, centroides)

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

// Cache simples em memoria (dura so enquanto a instancia da Edge Function
// estiver "quente") pra nao geocodificar o mesmo endereco de unidade em toda
// chamada.
const unitCoordsCache = new Map<string, { lat: number; lng: number }>()

// Geocodifica um endereco (usado aqui so pro endereco da unidade, pra achar
// o aluno mais distante por coordenada) e guarda o resultado em cache.
// Precisa que a Geocoding API esteja ativada pra essa mesma chave de API.
async function geocodeEndereco(endereco: string, apiKey: string): Promise<{ lat: number; lng: number } | null> {
  const emCache = unitCoordsCache.get(endereco)
  if (emCache) {
    return emCache
  }

  const url =
    'https://maps.googleapis.com/maps/api/geocode/json' +
    `?address=${encodeURIComponent(endereco)}` +
    `&key=${apiKey}`

  try {
    const res = await fetch(url)
    const data = await res.json()

    if (data.status === 'OK' && data.results?.[0]?.geometry?.location) {
      const { lat, lng } = data.results[0].geometry.location
      const coords = { lat, lng }
      unitCoordsCache.set(endereco, coords)
      return coords
    }

    console.error('Geocoding API retornou status', data.status, data.error_message)
  } catch (error) {
    console.error('Erro ao geocodificar endereco da unidade:', error)
  }

  return null
}

// Soma a duracao (em segundos) de todas as "legs" de uma resposta da
// Directions API - pequeno helper repetido em varios pontos abaixo.
function somarDuracaoSegundos(data: any): number {
  return (data.routes?.[0]?.legs ?? []).reduce(
    (acc: number, leg: { duration?: { value?: number } }) => acc + (leg.duration?.value ?? 0),
    0,
  )
}

// Traca a rota de IDA: comeca sempre no aluno mais distante da unidade (por
// linha reta - haversine) e termina na unidade, otimizando pela Directions
// API só a ordem das paradas RESTANTES nesse meio de caminho. Devolve a
// ordem final junto com a duracao total do trajeto (ponto mais distante ->
// ... -> unidade), usada pra calcular o horario de inicio de tras pra
// frente a partir do horario-alvo de chegada.
//
// Se a unidade nao puder ser geocodificada por algum motivo (Geocoding API
// desativada pra essa chave, por exemplo), cai de volta pra tratar o
// primeiro aluno da lista como "mais distante" sem garantia nenhuma - um
// log de erro avisa quando isso acontece.
async function tracarRotaIda(enderecoUnidade: string, alunos: Aluno[], apiKey: string) {
  if (alunos.length === 0) {
    return { ordenados: [] as Aluno[], duracaoSegundos: 0 }
  }

  const coordsUnidade = await geocodeEndereco(enderecoUnidade, apiKey)

  let maisDistante = alunos[0]
  if (coordsUnidade) {
    let maiorDistancia = -1
    for (const aluno of alunos) {
      const distancia = haversineKm(aluno.latitude, aluno.longitude, coordsUnidade.lat, coordsUnidade.lng)
      if (distancia > maiorDistancia) {
        maiorDistancia = distancia
        maisDistante = aluno
      }
    }
  } else {
    console.error(
      'Nao foi possivel geocodificar o endereco da unidade (confira se a Geocoding API esta ativada pra ' +
        'GOOGLE_DIRECTIONS_API_KEY) - a rota de Ida nao tem garantia de comecar pelo aluno mais distante.',
    )
  }

  if (alunos.length === 1) {
    const url =
      'https://maps.googleapis.com/maps/api/directions/json' +
      `?origin=${encodeURIComponent(maisDistante.address)}` +
      `&destination=${encodeURIComponent(enderecoUnidade)}` +
      `&key=${apiKey}`

    let duracaoSegundos = 0
    try {
      const res = await fetch(url)
      const data = await res.json()
      if (data.status === 'OK') {
        duracaoSegundos = somarDuracaoSegundos(data)
      } else {
        console.error('Directions API retornou status', data.status, data.error_message)
      }
    } catch (error) {
      console.error('Erro ao chamar Directions API:', error)
    }

    return { ordenados: [maisDistante], duracaoSegundos }
  }

  const restantes = alunos.filter((a) => a !== maisDistante)
  const ordenados: Aluno[] = [maisDistante]
  let duracaoSegundos = 0
  let origemAtual = maisDistante.address

  // Mesma logica de paginacao de MAX_WAYPOINTS de antes, mas agora cada
  // pedido parte de onde o anterior terminou (nunca da unidade) - com ate
  // ~23 alunos (o normal pra uma van escolar) isso e sempre uma unica
  // requisicao e o calculo de duracao e exato; com mais alunos que isso, a
  // duracao de cada pedido intermediario soma tambem a ida até a unidade,
  // super-estimando um pouco o total (mesma ressalva que a versao anterior
  // deste arquivo já tinha).
  const grupos: Aluno[][] = []
  for (let i = 0; i < restantes.length; i += MAX_WAYPOINTS) {
    grupos.push(restantes.slice(i, i + MAX_WAYPOINTS))
  }

  for (const grupo of grupos) {
    const waypoints = grupo.map((a) => encodeURIComponent(a.address)).join('|')
    const url =
      'https://maps.googleapis.com/maps/api/directions/json' +
      `?origin=${encodeURIComponent(origemAtual)}` +
      `&destination=${encodeURIComponent(enderecoUnidade)}` +
      `&waypoints=optimize:true|${waypoints}` +
      `&key=${apiKey}`

    try {
      const res = await fetch(url)
      const data = await res.json()

      if (data.status === 'OK' && data.routes?.[0]?.waypoint_order) {
        const ordem: number[] = data.routes[0].waypoint_order
        const grupoOrdenado = ordem.map((i) => grupo[i])
        ordenados.push(...grupoOrdenado)
        duracaoSegundos += somarDuracaoSegundos(data)
        origemAtual = grupoOrdenado[grupoOrdenado.length - 1]?.address ?? origemAtual
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

// Traca o loop unidade -> paradas (na melhor ordem) -> unidade, e devolve a
// ordem otimizada junto com a duracao total do trajeto (soma de todas as
// pernas). Usado so pra VOLTA - sem ponto de partida fixo, a Directions API
// e livre pra escolher a ordem que minimiza o trajeto todo.
//
// Nota: quando ha mais de MAX_WAYPOINTS alunos, a lista e dividida em varios
// pedidos e a duracao de cada pedido e somada. Isso super-estima levemente a
// duracao real (cada pedido soma sua propria volta ate a unidade), mas para
// rotas de ate ~23 alunos (o normal pra uma van escolar) e sempre uma unica
// requisicao, entao o calculo e exato.
async function tracarRotaVolta(enderecoUnidade: string, alunos: Aluno[], apiKey: string) {
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

      // Pra cada veiculo, resolve quem ja esta na rota dele (de uma geracao
      // anterior) junto com a capacidade que ainda sobra - essa lista de
      // "quem ja esta la" e reaproveitada tanto pra ancorar o clustering
      // (logo abaixo) quanto, mais adiante, pra juntar com os alunos novos
      // na hora de retracar a rota inteira.
      const veiculosComCapacidadeRestante = veiculosDaUnidade.map((v) => {
        const rotaExistente = rotaExistentePorVeiculo.get(v.id) as any
        const alunosJaNaRota: Aluno[] = rotaExistente
          ? ((rotaExistente.stops || [])
              .map((s: any) => todosAlunos.find((a) => a.id === s.student_id))
              .filter(Boolean) as Aluno[])
          : []

        return { ...v, capacity: Math.max(0, v.capacity - alunosJaNaRota.length), alunosJaNaRota }
      })

      const veiculosDisponiveis = veiculosComCapacidadeRestante.filter((v) => v.capacity > 0)

      if (veiculosDisponiveis.length === 0) {
        resumo.alunosSemVeiculoDaUnidade.push(...alunosDoGrupo.map((a) => a.name))
        continue
      }

      // Ancora o clustering na posicao media de quem ja esta em cada
      // veiculo nessa rota - e o que faz um aluno novo tender a cair no
      // MESMO veiculo que os colegas de regiao que ja estavam la, em vez de
      // ser distribuido so pela vaga que sobrou em cada veiculo. Um veiculo
      // sem ninguem ainda (null) continua usando a semente padrao dentro de
      // clusterizarAlunos.
      const centroidesIniciais = veiculosDisponiveis.map((v) => {
        if (v.alunosJaNaRota.length === 0) {
          return null
        }
        const lat = v.alunosJaNaRota.reduce((acc, a) => acc + a.latitude, 0) / v.alunosJaNaRota.length
        const lng = v.alunosJaNaRota.reduce((acc, a) => acc + a.longitude, 0) / v.alunosJaNaRota.length
        return { lat, lng }
      })

      const { clusters, sobrando } = clusterizarAlunos(alunosDoGrupo, veiculosDisponiveis, centroidesIniciais)
      resumo.alunosSemVeiculo.push(...sobrando.map((a) => a.name))

      for (let i = 0; i < veiculosDisponiveis.length; i++) {
        const alunosNovosDoVeiculo = clusters[i]
        if (alunosNovosDoVeiculo.length === 0) {
          continue
        }

        const veiculo = veiculosDisponiveis[i]
        const rotaExistente = rotaExistentePorVeiculo.get(veiculo.id) as any

        // Junta quem ja estava na rota (calculado acima) com os alunos
        // novos e retraca a ordem toda (nao so anexa no final - reotimiza
        // com todo mundo junto).
        const todosOsAlunosDaRota = [...veiculo.alunosJaNaRota, ...alunosNovosDoVeiculo]

        const { ordenados, duracaoSegundos } =
          direcao === 'Ida'
            ? await tracarRotaIda(enderecoUnidade, todosOsAlunosDaRota, googleApiKey)
            : await tracarRotaVolta(enderecoUnidade, todosOsAlunosDaRota, googleApiKey)

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