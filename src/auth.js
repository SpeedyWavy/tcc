const TOKEN_KEY = 'token'
const REFRESH_TOKEN_KEY = 'refreshToken'
const USER_KEY = 'user'

export function getStoredToken() {
  return window.localStorage.getItem(TOKEN_KEY)
}

export function getStoredRefreshToken() {
  return window.localStorage.getItem(REFRESH_TOKEN_KEY)
}

export function getStoredUser() {
  const rawUser = window.localStorage.getItem(USER_KEY)

  if (!rawUser) {
    return null
  }

  try {
    return JSON.parse(rawUser)
  } catch {
    clearSession()
    return null
  }
}

export function saveSession(session, user) {
  if (typeof session === 'string') {
    window.localStorage.setItem(TOKEN_KEY, session)
  } else if (session && typeof session === 'object') {
    if (session.access_token) {
      window.localStorage.setItem(TOKEN_KEY, session.access_token)
    }
    if (session.refresh_token) {
      window.localStorage.setItem(REFRESH_TOKEN_KEY, session.refresh_token)
    }
  }

  window.localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearSession() {
  window.localStorage.removeItem(TOKEN_KEY)
  window.localStorage.removeItem(REFRESH_TOKEN_KEY)
  window.localStorage.removeItem(USER_KEY)
}

export function getHomePathByRole(role) {
  if (role === 'admin') {
    return '/app'
  }

  if (role === 'driver') {
    return '/inicial'
  }

  return '/'
}

export function requireAuth(pathname) {
  const user = getStoredUser()
  const publicRoutes = new Set(['/', '/suporte'])
  const adminRoutes = new Set([
    '/app',
    '/gerenciar-alunos',
    '/gerenciar-motoristas',
    '/gerenciar-veiculos',
    '/gerenciar-revisoes',
    '/gerenciar-rotas',
    '/gerenciar-administradores',
  ])
  const driverRoutes = new Set(['/inicial', '/motorista-alunos', '/motorista-contatos', '/motorista-rotas', '/motorista-trajeto', '/motorista-veiculo'])

  if (publicRoutes.has(pathname)) {
    return { allowed: true, redirectTo: user ? getHomePathByRole(user.role) : null }
  }

  if (!user) {
    return { allowed: false, redirectTo: '/' }
  }

  if (adminRoutes.has(pathname) && user.role !== 'admin') {
    return { allowed: false, redirectTo: getHomePathByRole(user.role) }
  }

  if (driverRoutes.has(pathname) && user.role !== 'driver') {
    return { allowed: false, redirectTo: getHomePathByRole(user.role) }
  }

  return { allowed: true, redirectTo: null }
}
