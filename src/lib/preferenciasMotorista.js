// Preferencias do motorista, salvas localmente (localStorage) - nao dependem do backend.

const CHAVE_MODO_ESCURO = 'rds_modo_escuro'
const CHAVE_PREFERENCIA_NAVEGACAO = 'rds_preferencia_navegacao'
const CHAVE_MODO_NAVEGACAO = 'rds_modo_navegacao'

export const NAVEGACAO_GOOGLE_MAPS = 'google_maps'
export const NAVEGACAO_WAZE = 'waze'

// Como o trajeto se comporta:
// - PASSO_A_PASSO: card de um aluno por vez, com link externo por parada.
// - ROTA_COMPLETA: abre o Google Maps ja com todas as paradas carregadas de
//   uma vez (o motorista nao precisa voltar ao app entre paradas).
// - EMBUTIDO: fica dentro do app, usando o GPS pra acompanhar a posicao do
//   motorista e avancar sozinho conforme ele chega em cada parada.
export const MODO_PASSO_A_PASSO = 'passo_a_passo'
export const MODO_ROTA_COMPLETA = 'rota_completa'
export const MODO_EMBUTIDO = 'embutido'

export function getModoEscuro() {
  return localStorage.getItem(CHAVE_MODO_ESCURO) === 'true'
}

// Aplica a classe no elemento raiz. Chame isso uma vez ao carregar qualquer
// pagina (o UserMenu ja faz isso, ja que aparece no cabecalho de todas elas).
export function aplicarModoEscuro(ativo) {
  document.documentElement.classList.toggle('modo-escuro', ativo)
}

export function setModoEscuro(ativo) {
  localStorage.setItem(CHAVE_MODO_ESCURO, ativo ? 'true' : 'false')
  aplicarModoEscuro(ativo)
}

export function getPreferenciaNavegacao() {
  const salvo = localStorage.getItem(CHAVE_PREFERENCIA_NAVEGACAO)
  return salvo === NAVEGACAO_WAZE ? NAVEGACAO_WAZE : NAVEGACAO_GOOGLE_MAPS
}

export function setPreferenciaNavegacao(valor) {
  localStorage.setItem(CHAVE_PREFERENCIA_NAVEGACAO, valor)
}

export function getModoNavegacao() {
  const salvo = localStorage.getItem(CHAVE_MODO_NAVEGACAO)
  if (salvo === MODO_ROTA_COMPLETA || salvo === MODO_EMBUTIDO) {
    return salvo
  }
  return MODO_PASSO_A_PASSO
}

export function setModoNavegacao(valor) {
  localStorage.setItem(CHAVE_MODO_NAVEGACAO, valor)
}