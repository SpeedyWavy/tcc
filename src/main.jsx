import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import AppRouter from './AppRouter.jsx'
import { aplicarModoEscuro, getModoEscuro } from './lib/preferenciasMotorista.js'

aplicarModoEscuro(getModoEscuro())

const rootEl = document.getElementById('root')
if (!rootEl) {
  throw new Error('Root element not found')
}

createRoot(rootEl).render(
  <StrictMode>
    <AppRouter />
  </StrictMode>,
)

// 
