import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './admin/App.jsx'
import GerenciarAdministradores from './admin/GerenciarAdministradores.jsx'
import GerenciarAlunos from './admin/GerenciarAlunos.jsx'
import GerenciarMotoristas from './admin/GerenciarMotoristas.jsx'
import GerenciarRevisoes from './admin/GerenciarRevisoes.jsx'
import GerenciarRotas from './admin/GerenciarRotas.jsx'
import GerenciarVeiculos from './admin/GerenciarVeiculos.jsx'
import Login from './Login.jsx'
import Suporte from './Suporte.jsx'
import AlunosMotorista from './motorista/Alunos.jsx'
import ContatosMotorista from './motorista/Contatos.jsx'
import RotasMotorista from './motorista/Rotas.jsx'
import Inicial from './motorista/Inicial.jsx'
import { requireAuth } from './auth.js'
import Mais from './admin/Mais.jsx'

const pathname = window.location.pathname.toLowerCase()
const authState = requireAuth(pathname)

if (authState.redirectTo && authState.redirectTo !== pathname) {
  window.location.replace(authState.redirectTo)
}

// Seleciona a pagina com base na rota atual
const CurrentPage = pathname === '/gerenciar-alunos'
  ? GerenciarAlunos
  : pathname === '/gerenciar-motoristas'
    ? GerenciarMotoristas
    : pathname === '/gerenciar-veiculos'
      ? GerenciarVeiculos
    : pathname === '/gerenciar-revisoes'
      ? GerenciarRevisoes
    : pathname === '/gerenciar-rotas'
      ? GerenciarRotas
    : pathname === '/gerenciar-administradores'
      ? GerenciarAdministradores
    : pathname === '/suporte'
      ? Suporte
    : pathname === '/motorista-alunos'
      ? AlunosMotorista
    : pathname === '/motorista-contatos'
      ? ContatosMotorista
    : pathname === '/motorista-rotas'
      ? RotasMotorista
    : pathname === '/mais'
      ? Mais
    : pathname === '/inicial'
      ? Inicial
    : pathname === '/app'
      ? App
      : Login

const rootEl = document.getElementById('root')
if (!rootEl) {
  throw new Error('Root element not found')
}

if (authState.allowed) {
  createRoot(rootEl).render(
    <StrictMode>
      {/* Renderizacao da pagina escolhida */}
      <CurrentPage />
    </StrictMode>,
  )
}
