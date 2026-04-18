import axios from 'axios'

/**
 * Base Axios instance for all API calls.
 *
 * In development (Vite dev server): requests go to the dev server which
 * proxies /api → http://backend:8000 (configured in vite.config.ts).
 *
 * In production (nginx): nginx.conf proxies /api → http://backend:8000.
 *
 * Either way, code always calls `/api/...` — no environment-specific URLs needed.
 */
export const api = axios.create({
  baseURL: '/',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
})

// ── Request interceptor — attach JWT ─────────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ── Response interceptor — handle auth errors globally ───────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid — clear storage and redirect to login
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  },
)
