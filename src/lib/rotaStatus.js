// Regras de ciclo de status das rotas, compartilhadas entre a tela do
// motorista (Trajeto.jsx) e a do admin (GerenciarRotas.jsx).

export const STATUS_AGUARDANDO = 'Aguardando Saida'
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

// Reaproveita rotas concluídas diariamente, voltando para aguardando uma
// hora antes do horário programado. A comparação tolera acentos e espaços.
export async function resetarRotasProximas(supabase) {
  const agora = minutosAgora()
  const { data: rotas, error } = await supabase
    .from('routes')
    .select('id, status, horario_inicio')
    .not('horario_inicio', 'is', null)

  if (error) {
    console.error('Erro ao verificar rotas para reset de status:', error)
    return
  }

  const idsParaResetar = (rotas || [])
    .filter((rota) => {
      if (normalizarStatus(rota.status) !== normalizarStatus(STATUS_CONCLUIDO)) return false
      const diferenca = diferencaHorario(rota, agora)
      return diferenca != null && diferenca >= 0 && diferenca <= MINUTOS_ANTES_RESET
    })
    .map((rota) => rota.id)

  if (idsParaResetar.length === 0) return

  const { error: erroUpdate } = await supabase
    .from('routes')
    .update({ status: STATUS_AGUARDANDO })
    .in('id', idsParaResetar)

  if (erroUpdate) console.error('Erro ao resetar rotas próximas do horário:', erroUpdate)
}

// Prioriza uma rota em andamento. Uma rota aguardando só fica disponível
// até uma hora antes do horário; assim as próximas não aparecem cedo demais.
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
      // Os horários das rotas se repetem diariamente. Se todos os horários
      // de hoje já passaram, a próxima rota é a primeira do próximo dia.
      const minutosAteRota = ((diferenca % 1440) + 1440) % 1440 || 1440
      return { rota, minutosAteRota }
    })
    .filter(Boolean)
    .sort((a, b) => a.minutosAteRota - b.minutosAteRota)[0]?.rota || null
}
