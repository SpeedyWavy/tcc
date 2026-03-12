import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import GerenciarAlunos from './GerenciarAlunos.jsx'
import GerenciarMotoristas from './GerenciarMotoristas.jsx'
import GerenciarVeiculos from './GerenciarVeiculos.jsx'
import Login from './Login.jsx'

const pathname = window.location.pathname.toLowerCase()
const CurrentPage = pathname === '/gerenciar-alunos'
  ? GerenciarAlunos
  : pathname === '/gerenciar-motoristas'
    ? GerenciarMotoristas
    : pathname === '/gerenciar-veiculos'
      ? GerenciarVeiculos
    : pathname === '/app'
      ? App
      : Login

const rootEl = document.getElementById('root')
if (!rootEl) {
  throw new Error('Root element not found')
}

createRoot(rootEl).render(
  <StrictMode>
    <CurrentPage />
  </StrictMode>,
)
