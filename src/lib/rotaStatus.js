// Regras de ciclo de status das rotas, compartilhadas entre a tela do
// motorista (Trajeto.jsx) e a do admin (GerenciarRotas.jsx) - pra nao
// duplicar a mesma regra em dois lugares.

export const STATUS_AGUARDANDO = 'Aguardando Saida'
export const STATUS_EM_TRANSITO = 'Em Transito'
export const STATUS_ATRASADO = 'Atrasado'
export const STATUS_CONCLUIDO = 'Concluido'

// Quanto tempo antes do horario programado uma rota concluida volta
// sozinha pra "Aguardando Saida" (pra poder ser rodada de novo no proximo
// dia letivo).
const MINUTOS_ANTES_RESET = 60

function horarioParaMinutos(horario) {
  if (!horario || typeof horario !== 'string') {
    return null
  }
  const [h, m] = horario.split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) {
    return null
  }
  return h * 60 + m
}

function minutosAgora() {
  const agora = new Date()
  return agora.getHours() * 60 + agora.getMinutes()
}

// Rotas sao reaproveitadas dia apos dia (nao sao recriadas toda vez): 1h
// antes do horario de inicio programado, uma rota "Concluida" volta sozinha
// pra "Aguardando Saida". Nao depende de nenhum job agendado no servidor -
// roda "sob demanda", toda vez que a tela do motorista ou a do admin
// carrega os dados, o que cobre bem o caso real (motorista abre o app perto
// do horario que precisa sair).
export async function resetarRotasProximas(supabase) {
  const agora = minutosAgora()

  const { data: concluidas, error } = await supabase
    .from('routes')
    .select('id, horario_inicio')
    .eq('status', STATUS_CONCLUIDO)
    .not('horario_inicio', 'is', null)

  if (error) {
    console.error('Erro ao verificar rotas para reset de status:', error)
    return
  }

  const idsParaResetar = (concluidas || [])
    .filter((rota) => {
      const minutos = horarioParaMinutos(rota.horario_inicio)
      if (minutos == null) {
        return false
      }
      const diferenca = minutos - agora
      return diferenca >= 0 && diferenca <= MINUTOS_ANTES_RESET
    })
    .map((rota) => rota.id)

  if (idsParaResetar.length === 0) {
    return
  }

  const { error: erroUpdate } = await supabase
    .from('routes')
    .update({ status: STATUS_AGUARDANDO })
    .in('id', idsParaResetar)

  if (erroUpdate) {
    console.error('Erro ao resetar rotas proximas do horario:', erroUpdate)
  }
}

// Entre as rotas ainda nao concluidas de um veiculo (pode haver uma de Ida e
// uma de Volta ao mesmo tempo), escolhe qual e "a rota agora":
// 1. Se alguma ja esta em andamento (Em Transito/Atrasado), essa vence -
//    o motorista esta no meio de um trajeto, nao faz sentido trocar.
// 2. Senao, entre as que estao "Aguardando Saida", escolhe a que tem o
//    horario_inicio mais proximo do horario atual (de manha cedo cai na
//    rota de Ida, de tarde cai na de Volta).
export function escolherRotaAtual(rotas) {
  if (!rotas || rotas.length === 0) {
    return null
  }

  const emAndamento = rotas.find((r) => r.status === STATUS_EM_TRANSITO || r.status === STATUS_ATRASADO)
  if (emAndamento) {
    return emAndamento
  }

  const aguardando = rotas.filter((r) => r.status === STATUS_AGUARDANDO)
  if (aguardando.length === 0) {
    return rotas[0]
  }

  const agora = minutosAgora()

  return aguardando.reduce((melhor, atual) => {
    const minutosAtual = horarioParaMinutos(atual.horario_inicio)
    const minutosMelhor = horarioParaMinutos(melhor.horario_inicio)

    if (minutosAtual == null) {
      return melhor
    }
    if (minutosMelhor == null) {
      return atual
    }

    const diferencaAtual = Math.abs(minutosAtual - agora)
    const diferencaMelhor = Math.abs(minutosMelhor - agora)

    return diferencaAtual < diferencaMelhor ? atual : melhor
  })
}