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
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    if (config.headers && typeof config.headers.set === 'function') {
      config.headers.set('Content-Type', undefined)
    } else if (config.headers) {
      delete config.headers['Content-Type']
      delete config.headers['content-type']
    }
  }

  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

type Role = 'PASSENGER' | 'DRIVER' | 'ADMIN'
type DriverStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | null
type AccountStatus = 'ACTIVE' | 'WARNED' | 'SUSPENDED' | 'BANNED'
type AcademicRole = 'STUDENT' | 'STAFF' | null
type AcademicVerificationStatus =
  | 'NOT_SUBMITTED'
  | 'PENDING'
  | 'VERIFIED'
  | 'REJECTED'

export type MeApiResponse = {
  id: string
  email: string
  name: string
  phone: string | null
  role: Role
  mustChangePassword: boolean
  accountStatus: AccountStatus
  suspendedUntil: string | null
  avatarPath: string | null
  bio: string | null
  homeAddress: string | null
  homeLat: number | null
  homeLng: number | null
  campusAddress: string | null
  campusLat: number | null
  campusLng: number | null
  academicRole: AcademicRole
  academicVerificationStatus: AcademicVerificationStatus
  academicIdPath: string | null
  academicVerifiedAt: string | null
  academicRejectionReason: string | null
  driverStatus: DriverStatus
  createdAt: string
}

export type MeLegacyResponse = {
  data: MeApiResponse
}

export type MeUser = {
  id: string
  email: string
  name: string
  phone?: string
  role: Role
  mustChangePassword: boolean
  accountStatus: AccountStatus
  suspendedUntil: string | null
  avatarPath?: string
  bio?: string
  homeAddress?: string
  homeLat: number | null
  homeLng: number | null
  campusAddress?: string
  campusLat: number | null
  campusLng: number | null
  academicRole: AcademicRole
  academicVerificationStatus: AcademicVerificationStatus
  academicIdPath?: string
  academicVerifiedAt: string | null
  academicRejectionReason?: string
  isDriverApproved?: boolean
  driverStatus: DriverStatus
  createdAt: string
}

export function normalizeMeUser(payload: MeApiResponse): MeUser {
  const driverStatus = payload.driverStatus ?? null

  return {
    id: payload.id,
    email: payload.email,
    name: payload.name,
    phone: payload.phone ?? undefined,
    role: payload.role,
    mustChangePassword: payload.mustChangePassword,
    accountStatus: payload.accountStatus,
    suspendedUntil: payload.suspendedUntil,
    avatarPath: payload.avatarPath ?? undefined,
    bio: payload.bio ?? undefined,
    homeAddress: payload.homeAddress ?? undefined,
    homeLat: payload.homeLat ?? null,
    homeLng: payload.homeLng ?? null,
    campusAddress: payload.campusAddress ?? undefined,
    campusLat: payload.campusLat ?? null,
    campusLng: payload.campusLng ?? null,
    academicRole: payload.academicRole ?? null,
    academicVerificationStatus: payload.academicVerificationStatus,
    academicIdPath: payload.academicIdPath ?? undefined,
    academicVerifiedAt: payload.academicVerifiedAt ?? null,
    academicRejectionReason: payload.academicRejectionReason ?? undefined,
    isDriverApproved: driverStatus === 'APPROVED',
    driverStatus,
    createdAt: payload.createdAt,
  }
}

export async function fetchMe(): Promise<MeUser> {
  const res = await api.get<MeApiResponse | MeLegacyResponse>('/api/users/me')
  const payload = 'data' in res.data ? res.data.data : res.data
  return normalizeMeUser(payload)
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
