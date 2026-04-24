import axios from 'axios'

export const api = axios.create({
  baseURL: '/',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
})

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
  avatarUrl: string | null
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
      avatarPath: payload.avatarUrl ?? undefined,
      isDriverApproved: payload.driverStatus === 'APPROVED',
      driverStatus: payload.driverStatus,
    }
  }

  return payload
}
