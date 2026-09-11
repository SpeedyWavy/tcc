import { useEffect, useMemo, useState } from 'react'
import { flushSync } from 'react-dom'
import { Bus, MapPinned, Phone, Users } from 'lucide-react'
import App from './admin/App.jsx'
import GerenciarAdministradores from './admin/GerenciarAdministradores.jsx'
import GerenciarAlunos from './admin/GerenciarAlunos.jsx'
import GerenciarMotoristas from './admin/GerenciarMotoristas.jsx'
import GerenciarRevisoes from './admin/GerenciarRevisoes.jsx'
import GerenciarRotas from './admin/GerenciarRotas.jsx'
import GerenciarVeiculos from './admin/GerenciarVeiculos.jsx'
import Mais from './admin/Mais.jsx'
import Login from './Login.jsx'
import Suporte from './Suporte.jsx'
import AlunosMotorista from './motorista/Alunos.jsx'
import ContatosMotorista from './motorista/Contatos.jsx'
import Inicial from './motorista/Inicial.jsx'
import RotasMotorista from './motorista/Rotas.jsx'
import TrajetoMotorista from './motorista/Trajeto.jsx'
import VeiculoMotorista from './motorista/Veiculo.jsx'
import { requireAuth } from './auth.js'

const routes = {
  '/app': { component: App, area: 'admin', compact: true },
  '/gerenciar-alunos': { component: GerenciarAlunos, area: 'admin', title: 'Alunos', icon: Users },
  '/gerenciar-motoristas': { component: GerenciarMotoristas, area: 'admin', title: 'Motoristas', icon: Users },
  '/gerenciar-veiculos': { component: GerenciarVeiculos, area: 'admin', title: 'Veículos', icon: Bus },
  '/gerenciar-revisoes': { component: GerenciarRevisoes, area: 'admin', title: 'Revisões', icon: Bus },
  '/gerenciar-rotas': { component: GerenciarRotas, area: 'admin', title: 'Rotas', icon: MapPinned },
  '/gerenciar-administradores': { component: GerenciarAdministradores, area: 'admin', title: 'Administradores', icon: Users },
  '/mais': { component: Mais, area: 'admin', title: 'Mais' },
  '/inicial': { component: Inicial, area: 'driver', compact: true },
  '/motorista-alunos': { component: AlunosMotorista, area: 'driver', title: 'Alunos', icon: Users },
  '/motorista-contatos': { component: ContatosMotorista, area: 'driver', title: 'Contatos', icon: Phone },
  '/motorista-rotas': { component: RotasMotorista, area: 'driver', title: 'Rotas', icon: MapPinned },
  '/motorista-trajeto': { component: TrajetoMotorista, area: 'driver', title: 'Trajeto atual', icon: MapPinned },
  '/motorista-veiculo': { component: VeiculoMotorista, area: 'driver', title: 'Veículo', icon: Bus },
  '/suporte': { component: Suporte, public: true },
  '/': { component: Login, public: true },
}

const normalizarPathname = (pathname) => pathname.toLowerCase().replace(/\/$/, '') || '/'

function isInternalNavigation(event) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return null

  const link = event.target.closest('a[href]')
  if (!link || link.target || link.hasAttribute('download')) return null

  const url = new URL(link.href, window.location.origin)
  if (url.origin !== window.location.origin || !url.pathname.startsWith('/')) return null

  return url
}

export default function AppRouter() {
  const [pathname, setPathname] = useState(() => normalizarPathname(window.location.pathname))
  const [hasNavigated, setHasNavigated] = useState(false)
  const route = routes[pathname] || routes['/']
  const authState = requireAuth(pathname)

  const navigate = (to, { replace = false } = {}) => {
    const nextPath = normalizarPathname(to)
    if (nextPath === pathname) return

    const atualizarRota = () => {
      window.history[replace ? 'replaceState' : 'pushState']({}, '', nextPath)
      flushSync(() => {
        setHasNavigated(true)
        setPathname(nextPath)
      })
      window.scrollTo({ top: 0, behavior: 'instant' })
    }

    if (document.startViewTransition) {
      document.startViewTransition(atualizarRota)
    } else {
      atualizarRota()
    }
  }

  useEffect(() => {
    const handlePopState = () => {
      const atualizarRota = () => flushSync(() => {
        setHasNavigated(true)
        setPathname(normalizarPathname(window.location.pathname))
      })
      if (document.startViewTransition) {
        document.startViewTransition(atualizarRota)
      } else {
        atualizarRota()
      }
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    if (authState.redirectTo && authState.redirectTo !== pathname) {
      navigate(authState.redirectTo, { replace: true })
    }
  }, [authState.redirectTo, pathname])

  const Page = useMemo(() => route.component, [route])

  const handleNavigation = (event) => {
    const url = isInternalNavigation(event)
    if (!url) return

    event.preventDefault()
    navigate(`${url.pathname}${url.search}${url.hash}`)
  }

  if (!authState.allowed && !authState.redirectTo) return null

  return (
    <div className={`app-page-content ${hasNavigated ? 'app-page-content--transitioning' : ''}`} onClickCapture={handleNavigation}>
      <Page key={pathname} />
    </div>
  )
}
