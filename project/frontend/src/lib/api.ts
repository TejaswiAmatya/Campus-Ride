// frontend/src/lib/api.ts
import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
})

// Request interceptor to attach JWT from localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})