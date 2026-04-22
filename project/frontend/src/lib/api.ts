import axios from 'axios'

/**
 * Shared Axios instance for the app.
 * - Dev: baseURL `/` so requests like `/api/...` go through Vite proxy (vite.config.ts).
 * - Prod / custom: set `VITE_API_URL` (e.g. http://localhost:8000) if the API is not same-origin.
 */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    if (status === 401) {
      const hadSession = !!localStorage.getItem('access_token')
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      const path = window.location.pathname
      const publicAuth = path === '/login' || path === '/register'
      if (hadSession && !publicAuth) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  },
)
