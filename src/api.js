import { clearSession, getStoredToken } from './auth.js'

export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '')

export async function apiRequest(path, options = {}) {
  const token = getStoredToken()
  const headers = new Headers(options.headers || {})

  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json')
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  })

  const rawBody = await response.text()
  const data = rawBody ? JSON.parse(rawBody) : null

  if (!response.ok) {
    if (response.status === 401) {
      clearSession()
      window.location.replace('/')
    }

    throw new Error(data?.detail || 'Nao foi possivel concluir a solicitacao.')
  }

  return data
}
