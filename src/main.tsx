import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import GerenciarAlunos from './GerenciarAlunos.tsx'

const pathname = window.location.pathname.toLowerCase()
const CurrentPage = pathname === '/gerenciar-alunos' ? GerenciarAlunos : App

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CurrentPage />
  </StrictMode>,
)
