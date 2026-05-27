import { useEffect, useState } from 'react'
import styles from './Login.module.css'
import { getHomePathByRole, getStoredUser, saveSession } from './auth.js'
import { API_URL } from './api.js'

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
      setErrorMessage('Preencha nome e senha para entrar.')
      return
    }

    setLoading(true)
    setErrorMessage('')

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          full_name: fullName.trim(),
          password,
        }),
      })

      const rawBody = await response.text()
      const data = rawBody ? JSON.parse(rawBody) : null

      if (!response.ok) {
        throw new Error(data?.detail || 'Nao foi possivel fazer login.')
      }

      if (!data?.access_token || !data?.user) {
        throw new Error('A API respondeu sem os dados de autenticacao esperados.')
      }

      saveSession(data.access_token, data.user)
      window.location.replace(getHomePathByRole(data.user.role))
    } catch (error) {
      if (error instanceof SyntaxError) {
        setErrorMessage('A resposta do backend veio vazia ou em formato invalido. Verifique se a API esta rodando em ' + API_URL + '.')
      } else if (error instanceof TypeError) {
        setErrorMessage('Nao foi possivel conectar ao backend em ' + API_URL + '.')
      } else {
        setErrorMessage(error.message || 'Nao foi possivel fazer login.')
      }
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
        {/* Barras superiores */}
        <div className={styles['ui-header1']}></div>
        <div className={styles['ui-header2']}></div>
        {/* Marca do sistema */}
        <div className={styles['login-logo']}></div>
        <h1>Bem Vindo</h1>
        {/* Campos de acesso */}
        <form className={styles['opcoes']} onSubmit={handleSubmit}>
          <p>Insira seu nome completo</p>
          <input
            type="text"
            placeholder='Nome completo'
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            disabled={loading}
          />
          <div className={styles['campo-senha']}>
            <p>Insira sua Senha</p>
            <input
              type="password"
              placeholder='Senha'
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={loading}
            />
            <div className={styles['esqueci']}>
              <a href="/suporte">Esqueceu a Senha?</a>
            </div>
          </div>
          {errorMessage ? <p role="alert">{errorMessage}</p> : null}
        </form>
        

        {/* Botao principal */}
        <button className={styles['entrar']} type="button" onClick={handleLogin} disabled={loading}>
          <span>{loading ? 'Entrando...' : 'Entrar'}</span>
        </button>

        {/* Rodape visual */}
        <div className={styles['page-footer']}>
          <div className={styles['ui-footer']}></div>
          <div className={styles['ui-footer1']}></div>
        </div>

    </main>
    </>
  )
}

export default Login
