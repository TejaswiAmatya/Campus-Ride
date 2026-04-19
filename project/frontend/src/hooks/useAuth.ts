import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'

export interface AuthUser {
  id: string
  email: string
  name: string
  role: 'PASSENGER' | 'DRIVER' | 'ADMIN'
  avatarUrl?: string
  isDriverApproved: boolean
}

interface MeResponse {
  data: AuthUser
}

/**
 * Returns the currently authenticated user by calling GET /api/users/me.
 * Only fires the request when an access_token is present in localStorage.
 *
 * Usage:
 *   const { user, isAuthenticated, isLoading } = useAuth()
 */
export function useAuth() {
  const token = localStorage.getItem('access_token')

  const { data: user, isLoading } = useQuery({
    queryKey: ['auth', 'currentUser'],
    queryFn: async (): Promise<AuthUser> => {
      const res = await api.get<MeResponse>('/api/users/me')
      return res.data.data
    },
    enabled: !!token,
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  return {
    user: user ?? null,
    isAuthenticated: !!user,
    isLoading: !!token && isLoading,
  }
}

/**
 * Returns a logout function that clears tokens and invalidates the auth query.
 */
export function useLogout() {
  const queryClient = useQueryClient()

  return () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    queryClient.clear()
    window.location.href = '/login'
  }
}
