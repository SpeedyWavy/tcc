import { useEffect, useState } from 'react'
import styles from './Login.module.css'
import { getHomePathByRole, getStoredUser, saveSession } from './auth.js'
import { apiRequest } from './api.js'
import { supabase } from './supabase.js'

const backendApiUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

function normalizeText(value) {
  if (!value || typeof value !== 'string') {
    return ''
  }

  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

function normalizeAuthEmail(fullName) {
  const normalized = normalizeText(fullName)
  return `${normalized.replace(/\s+/g, '.')}@local.tcc`
}

function isEmailLike(value) {
  const normalized = normalizeText(value)
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)
}

function resolveLoginEmail(identifier) {
  const normalizedIdentifier = normalizeText(identifier)

  if (!normalizedIdentifier) {
    return ''
  }

  if (isEmailLike(normalizedIdentifier)) {
    return normalizedIdentifier
  }

  return normalizeAuthEmail(normalizedIdentifier)
}

function getLoginErrorMessage(error) {
  const rawMessage = normalizeText(error?.message)

  if (
    error?.status === 401 ||
    rawMessage.includes('invalid login credentials') ||
    rawMessage.includes('invalid login credential') ||
    rawMessage.includes('nome ou senha incorretos')
  ) {
    return 'Nome ou senha incorretos.'
  }

  if (
    rawMessage.includes('failed to fetch') ||
    rawMessage.includes('network error') ||
    rawMessage.includes('fetch failed')
  ) {
    return 'Nao foi possivel conectar ao servidor de autenticacao.'
  }

  return error?.message || 'Nao foi possivel fazer login.'
}

async function loginViaBackend(identifier, password) {
  const loginUrl = backendApiUrl ? `${backendApiUrl}/api/auth/login` : '/api/auth/login'
  const response = await fetch(loginUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      identifier,
      full_name: identifier,
      password,
    }),
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    const error = new Error(payload?.detail || 'Nome ou senha incorretos.')
    error.status = response.status
    throw error
  }

  return payload
}

async function resolveAppUserId(role, displayName, sessionUser) {
  try {
    const endpoint = role === 'admin' ? '/api/admins' : '/api/drivers'
    const users = await apiRequest(endpoint)
    if (!Array.isArray(users)) {
      return null
    }

    const normalizedEmail = normalizeText(sessionUser?.email)

    const matchByAuthUserId = users.find((user) => user.auth_user_id && user.auth_user_id === sessionUser?.id)
    if (matchByAuthUserId?.id) {
      return matchByAuthUserId.id
    }

    const matchByEmail = users.find(
      (user) => user.email && normalizeText(user.email) === normalizedEmail,
    )
    if (matchByEmail?.id) {
      return matchByEmail.id
    }

    return null
  } catch {
    return null
  }
}

async function resolveSessionRole(sessionUser, displayName) {
  const metadataRole = sessionUser?.app_metadata?.role
  if (metadataRole === 'admin' || metadataRole === 'driver') {
    return metadataRole
  }

  try {
    const authUserId = sessionUser?.id
    if (authUserId) {
      const { data: userByAuthId } = await supabase
        .from('users')
        .select('role')
        .eq('auth_user_id', authUserId)
        .maybeSingle()

      if (userByAuthId?.role === 'admin' || userByAuthId?.role === 'driver') {
        return userByAuthId.role
      }
    }

    const sessionEmail = normalizeText(sessionUser?.email)
    if (sessionEmail) {
      const { data: userByEmail } = await supabase
        .from('users')
        .select('role')
        .ilike('email', sessionEmail)
        .maybeSingle()

      if (userByEmail?.role === 'admin' || userByEmail?.role === 'driver') {
        return userByEmail.role
      }
    }

    const normalizedEmail = resolveLoginEmail(displayName)
    if (normalizedEmail) {
      const { data: userByEmail } = await supabase
        .from('users')
        .select('role')
        .ilike('email', normalizedEmail)
        .maybeSingle()

      if (userByEmail?.role === 'admin' || userByEmail?.role === 'driver') {
        return userByEmail.role
      }
    }
  } catch {
    return null
  }

  return null
}

function Login() {
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const user = getStoredUser()
    if (user) {
      window.location.replace(getHomePathByRole(user.role))
    }
  }, [])

  const handleLogin = async () => {
    if (!fullName.trim() || !password.trim()) {
      setErrorMessage('Informe Nome ou Email e Senha.')
      return
    }

    setLoading(true)
    setErrorMessage('')

    try {
      const loginIdentifier = fullName.trim()
      let backendAuth = null

      try {
        backendAuth = await loginViaBackend(loginIdentifier, password)
      } catch (backendError) {
        if (backendError?.status === 401) {
          throw backendError
        }
      }

      const backendUser = backendAuth?.user || null
      const email = backendUser?.email || resolveLoginEmail(loginIdentifier)
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        throw error
      }

      const sessionUser = data?.user
      const session = data?.session
      const sessionToken = session?.access_token

      if (!sessionToken || !sessionUser) {
        throw new Error('A autenticacao do Supabase nao retornou uma sessao valida.')
      }

      const role = backendUser?.role || await resolveSessionRole(sessionUser, loginIdentifier)
      if (role !== 'admin' && role !== 'driver') {
        throw new Error('Nao foi possivel identificar seu perfil com seguranca.')
      }
      const displayName =
        backendUser?.full_name ||
        sessionUser.app_metadata?.full_name ||
        sessionUser.user_metadata?.full_name ||
        loginIdentifier

      let appUserId = backendUser?.id || sessionUser.id
      const resolvedAppUserId = await resolveAppUserId(role, displayName, sessionUser)
      if (resolvedAppUserId) {
        appUserId = resolvedAppUserId
      }

      saveSession(session, {
        id: appUserId,
        auth_user_id: backendUser?.auth_user_id || sessionUser.id,
        email: backendUser?.email || sessionUser.email || '',
        full_name: displayName,
        role,
      })

      window.location.replace(getHomePathByRole(role))
    } catch (error) {
      setErrorMessage(getLoginErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    handleLogin()
  }

  return (
    <>
      <main className={styles['login-page']}>
        <div className={styles['ui-header1']}></div>
        <div className={styles['ui-header2']}></div>
        <div className={styles['login-logo']}></div>
        <h1>Bem Vindo</h1>
        <form className={styles['opcoes']} onSubmit={handleSubmit}>
          <p>Insira seu Nome ou Email</p>
          <input
            type="text"
            placeholder="Nome ou Email"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            disabled={loading}
            autoComplete="username"
          />
          <div className={styles['campo-senha']}>
            <p>Insira sua Senha</p>
            <input
              type="password"
              placeholder="Senha"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={loading}
            />
            <div className={styles['esqueci']}>
              <a href="/suporte">Esqueceu a Senha?</a>
            </div>
          </div>
          {errorMessage ? (
            <p className={styles['login-error']} role="alert" aria-live="assertive">
              {errorMessage}
            </p>
          ) : null}
        </form>

        <button className={styles['entrar']} type="button" onClick={handleLogin} disabled={loading}>
          <span>{loading ? 'Entrando...' : 'Entrar'}</span>
        </button>

        <div className={styles['page-footer']}>
          <div className={styles['ui-footer']}></div>
          <div className={styles['ui-footer1']}></div>
        </div>
      </main>
    </>
  )
}

export default Login
// 
