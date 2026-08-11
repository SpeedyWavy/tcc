// Preferencias do motorista, salvas localmente (localStorage) - nao dependem do backend.

const CHAVE_MODO_ESCURO = 'rds_modo_escuro'
const CHAVE_PREFERENCIA_NAVEGACAO = 'rds_preferencia_navegacao'

export const NAVEGACAO_GOOGLE_MAPS = 'google_maps'
export const NAVEGACAO_WAZE = 'waze'

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