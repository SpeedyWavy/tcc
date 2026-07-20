import { useEffect, useState } from 'react'
import styles from './Login.module.css'
import { getHomePathByRole, getStoredUser, saveSession } from './auth.js'
import { apiRequest } from './api.js'
import { supabase } from './supabase.js'

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

async function resolveAppUserId(role, displayName, sessionUser) {
  try {
    const endpoint = role === 'admin' ? '/api/admins' : '/api/drivers'
    const users = await apiRequest(endpoint)
    if (!Array.isArray(users)) {
      return null
    }

    const normalizedDisplayName = normalizeText(displayName)
    const normalizedEmail = normalizeText(sessionUser?.email)
    const normalizedAuthName = normalizeText(
      sessionUser?.app_metadata?.full_name || sessionUser?.user_metadata?.full_name || '',
    )

    const matchByEmail = users.find(
      (user) => user.email && normalizeText(user.email) === normalizedEmail,
    )
    if (matchByEmail?.id) {
      return matchByEmail.id
    }

    const matchByName = users.find((user) => {
      const userName = normalizeText(user.full_name)
      return userName === normalizedDisplayName || userName === normalizedAuthName
    })

    return matchByName?.id ?? null
  } catch {
    return null
  }
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
      setErrorMessage('Email ou Senha Incorretos.')
      return
    }

    setLoading(true)
    setErrorMessage('')

    try {
      const email = normalizeAuthEmail(fullName.trim())
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

      const role = sessionUser.app_metadata?.role || sessionUser.user_metadata?.role || 'driver'
      const displayName =
        sessionUser.app_metadata?.full_name || sessionUser.user_metadata?.full_name || fullName.trim()

      let appUserId = sessionUser.id
      const resolvedAppUserId = await resolveAppUserId(role, displayName, sessionUser)
      if (resolvedAppUserId) {
        appUserId = resolvedAppUserId
      }

      saveSession(session, {
        id: appUserId,
        email: sessionUser.email || '',
        full_name: displayName,
        role,
      })

      window.location.replace(getHomePathByRole(role))
    } catch (error) {
      setErrorMessage(error.message || 'Nao foi possivel fazer login.')
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
          <p>Insira seu nome completo</p>
          <input
            type="text"
            placeholder="Nome completo"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            disabled={loading}
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
