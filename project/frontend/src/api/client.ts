import axios from 'axios'
import type { AuthErrorState } from '@/store/authStore'

export const api = axios.create({
  baseURL: '/',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
})

type ApiErrorPayload = {
  error?: {
    code?: string
    message?: string
    details?: {
      suspendedUntil?: string
    }
  }
}

// Request interceptor — attach JWT
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

type Role = 'PASSENGER' | 'DRIVER' | 'ADMIN'
type DriverStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | null

type MeFlatResponse = {
  id: string
  email: string
  name: string
  role: Role
  avatarPath: string | null
  driverStatus: DriverStatus
  createdAt: string
}

type MeLegacyResponse = {
  data: {
    id: string
    email: string
    name: string
    role: Role
    avatarPath?: string
    isDriverApproved?: boolean
  }
}

export type MeUser = {
  id: string
  email: string
  name: string
  role: Role
  avatarPath?: string
  isDriverApproved?: boolean
  driverStatus?: DriverStatus
}

export async function fetchMe(): Promise<MeUser> {
  const res = await api.get<MeFlatResponse | MeLegacyResponse>('/api/users/me')
  const payload = 'data' in res.data ? res.data.data : res.data

  if ('driverStatus' in payload) {
    return {
      id: payload.id,
      email: payload.email,
      name: payload.name,
      role: payload.role,
      avatarPath: payload.avatarPath ?? undefined,
      isDriverApproved: payload.driverStatus === 'APPROVED',
      driverStatus: payload.driverStatus,
    }
  }

  return payload
}

export function extractApiError(
  error: unknown,
  fallbackMessage = 'Unable to complete authentication right now. Please try again.',
): AuthErrorState {
  if (axios.isAxiosError<ApiErrorPayload>(error)) {
    const code = error.response?.data?.error?.code
    const message = error.response?.data?.error?.message
    const suspendedUntil = error.response?.data?.error?.details?.suspendedUntil

    if (code && message) {
      return {
        code,
        message,
        suspendedUntil: suspendedUntil ?? null,
      }
    }
  }

  return {
    code: 'AUTH_ERROR',
    message: fallbackMessage,
  }
}
