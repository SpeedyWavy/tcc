import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './admin/App.jsx'
import GerenciarAdministradores from './admin/GerenciarAdministradores.jsx'
import GerenciarAlunos from './admin/GerenciarAlunos.jsx'
import GerenciarMotoristas from './admin/GerenciarMotoristas.jsx'
import GerenciarVeiculos from './admin/GerenciarVeiculos.jsx'
import Login from './Login.jsx'

const pathname = window.location.pathname.toLowerCase()
// Seleciona a pagina com base na rota atual
const CurrentPage = pathname === '/gerenciar-alunos'
  ? GerenciarAlunos
  : pathname === '/gerenciar-motoristas'
    ? GerenciarMotoristas
    : pathname === '/gerenciar-veiculos'
      ? GerenciarVeiculos
    : pathname === '/gerenciar-administradores'
      ? GerenciarAdministradores
    : pathname === '/app'
      ? App
      : Login

const rootEl = document.getElementById('root')
if (!rootEl) {
  throw new Error('Root element not found')
}

createRoot(rootEl).render(
  <StrictMode>
    {/* Renderizacao da pagina escolhida */}
    <CurrentPage />
  </StrictMode>,
)
