// Regras de ciclo de status das rotas, compartilhadas entre a tela do
// motorista (Trajeto.jsx) e a do admin (GerenciarRotas.jsx).

export const STATUS_AGUARDANDO = 'Aguardando Saída'
export const STATUS_EM_TRANSITO = 'Em Transito'
export const STATUS_ATRASADO = 'Atrasado'
export const STATUS_CONCLUIDO = 'Concluido'

const MINUTOS_ANTES_RESET = 60

function normalizarStatus(status) {
  return String(status || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
}

function horarioParaMinutos(horario) {
  if (!horario || typeof horario !== 'string') return null
  const partes = horario.match(/\b(\d{1,2}):(\d{2})\b/)
  if (!partes) return null
  const h = Number(partes[1])
  const m = Number(partes[2])
  if (h > 23 || m > 59) return null
  return h * 60 + m
}

function minutosAgora() {
  const agora = new Date()
  return agora.getHours() * 60 + agora.getMinutes()
}

function diferencaHorario(rota, agora) {
  const minutos = horarioParaMinutos(rota.horario_inicio) ?? horarioParaMinutos(rota.horario)
  return minutos == null ? null : minutos - agora
}

// Reaproveita rotas diariamente: uma rota "Concluido" volta pra "Aguardando
// Saída" quando a janela de hoje (MINUTOS_ANTES_RESET antes do horario de
// inicio) ja abriu e a rota foi atualizada pela ultima vez ANTES dessa
// abertura. Assim ela volta mesmo que o app so seja aberto depois do
// horario de saida (a regra antiga so resetava se a tela fosse aberta dentro
// da hora anterior ao horario). Rotas "Em Transito"/"Atrasado" esquecidas de
// um dia anterior tambem voltam. A comparacao tolera acentos e espacos.
//
// Depende de routes.updated_at refletir quando o status mudou (Trajeto.jsx
// grava updated_at ao mudar o status). Se a coluna nao existir, cai na regra
// antiga (janela de 1h) pra nao quebrar nada.
const STATUS_RESETAVEIS = [STATUS_CONCLUIDO, STATUS_EM_TRANSITO, STATUS_ATRASADO].map(normalizarStatus)

function inicioDaJanelaHoje(rota) {
  const minutosInicio = horarioParaMinutos(rota.horario_inicio) ?? horarioParaMinutos(rota.horario)
  if (minutosInicio == null) return null
  const janela = new Date()
  janela.setHours(0, 0, 0, 0)
  janela.setMinutes(minutosInicio - MINUTOS_ANTES_RESET)
  return janela
}

export async function resetarRotasProximas(supabase) {
  const agora = new Date()
  let usaUpdatedAt = true

  let { data: rotas, error } = await supabase
    .from('routes')
    .select('id, status, horario_inicio, horario, updated_at')

  if (error) {
    // Provavelmente a coluna updated_at nao existe: tenta sem ela.
    usaUpdatedAt = false
    ;({ data: rotas, error } = await supabase
      .from('routes')
      .select('id, status, horario_inicio, horario'))
  }

  if (error) {
    console.error('Erro ao verificar rotas para reset de status:', error)
    return
  }

  const idsParaResetar = (rotas || [])
    .filter((rota) => {
      const status = normalizarStatus(rota.status)
      if (!STATUS_RESETAVEIS.includes(status)) return false

      if (!usaUpdatedAt) {
        // Regra antiga: so concluidas, dentro da hora anterior ao horario.
        if (status !== normalizarStatus(STATUS_CONCLUIDO)) return false
        const diferenca = diferencaHorario(rota, minutosAgora())
        return diferenca != null && diferenca >= 0 && diferenca <= MINUTOS_ANTES_RESET
      }

      const janela = inicioDaJanelaHoje(rota)
      if (!janela || agora < janela) return false

      const ultima = rota.updated_at ? new Date(rota.updated_at) : null
      if (!ultima || Number.isNaN(ultima.getTime())) {
        return status === normalizarStatus(STATUS_CONCLUIDO)
      }
      return ultima < janela
    })
    .map((rota) => rota.id)

  if (idsParaResetar.length === 0) return

  const campos = usaUpdatedAt
    ? { status: STATUS_AGUARDANDO, updated_at: new Date().toISOString() }
    : { status: STATUS_AGUARDANDO }

  const { data: atualizadas, error: erroUpdate } = await supabase
    .from('routes')
    .update(campos)
    .in('id', idsParaResetar)
    .select('id')

  if (erroUpdate) {
    console.error('Erro ao resetar rotas proximas do horário:', erroUpdate)
    return
  }

  if ((atualizadas || []).length < idsParaResetar.length) {
    console.warn(
      'Algumas rotas nao foram resetadas (nenhuma linha afetada) - provavelmente falta politica de RLS liberando UPDATE em "routes" pra esse usuario.',
    )
  }
}

// Prioriza uma rota em andamento. Uma rota aguardando so fica disponivel
// ate uma hora antes do horario; assim as proximas nao aparecem cedo demais.
export function escolherRotaAtual(rotas) {
  if (!rotas || rotas.length === 0) return null

  const emAndamento = rotas.find((rota) => {
    const status = normalizarStatus(rota.status)
    return status === normalizarStatus(STATUS_EM_TRANSITO) || status === normalizarStatus(STATUS_ATRASADO)
  })
  if (emAndamento) return emAndamento

  const agora = minutosAgora()
  const disponiveis = rotas.filter((rota) => {
    if (normalizarStatus(rota.status) !== normalizarStatus(STATUS_AGUARDANDO)) return false
    const diferenca = diferencaHorario(rota, agora)
    return diferenca == null || diferenca <= MINUTOS_ANTES_RESET
  })

  if (disponiveis.length === 0) return null

  return disponiveis.reduce((melhor, atual) => {
    const diferencaAtual = diferencaHorario(atual, agora)
    const diferencaMelhor = diferencaHorario(melhor, agora)
    if (diferencaAtual == null) return melhor
    if (diferencaMelhor == null) return atual
    return Math.abs(diferencaAtual) < Math.abs(diferencaMelhor) ? atual : melhor
  }, disponiveis[0])
}

export function obterProximaRota(rotas) {
  const agora = minutosAgora()
  return (rotas || [])
    .map((rota) => {
      const diferenca = diferencaHorario(rota, agora)
      if (diferenca == null) return null
      // Os horarios das rotas se repetem diariamente. Se todos os horarios
      // de hoje ja passaram, a proxima rota e a primeira do proximo dia.
      const minutosAteRota = ((diferenca % 1440) + 1440) % 1440 || 1440
      return { rota, minutosAteRota }
    })
    .filter(Boolean)
    .sort((a, b) => a.minutosAteRota - b.minutosAteRota)[0]?.rota || null
}