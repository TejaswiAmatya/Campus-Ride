import { useEffect } from 'react'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { api } from '../api/client'
import { useAuthStore } from '@/store/authStore'

export interface AuthUser {
  id: string
  email: string
  name: string
  role: 'PASSENGER' | 'DRIVER' | 'ADMIN'
  avatarPath?: string
  isDriverApproved: boolean
}

interface currentUserResponse {
  data: AuthUser
}

interface LoginResponse {
  data: {
    access_token: string
    refresh_token: string
  }
}

interface RegisterInput {
  email: string
  password: string
  name: string
  phone?: string
}

interface RegisterResponse {
  data: {
    id: string
    email: string
    name: string
  }
}

const currentUserKey = ['auth', 'currentUser'] as const

const fetchCurrentUser = async (): Promise<AuthUser | null> => {
  try {
    const res = await api.get<currentUserResponse>('/api/users/me')
    return res.data?.data ?? null
  } catch {
    return null
  }
}


/**
 * Returns the currently authenticated user by calling GET /api/users/me.
 * Only fires the request when an access_token is present in localStorage.
 */
export function useAuth() {
  // Get the access token and user from the auth store so we can conditionally fetch the current user profile.
  const token = useAuthStore((state) => state.accessToken)
  const currentUser = useAuthStore((state) => state.user)
  const setUser = useAuthStore((state) => state.setUser)
  const clearSession = useAuthStore((state) => state.clearSession)

  // Fetch the current user profile if we have an access token but no user in the store.
  const { data, isLoading } = useQuery({
    queryKey: ['auth', 'currentUser'],
    queryFn: fetchCurrentUser,
    enabled: !!token,
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  useEffect(() => {
    if (token && data === null && !isLoading && currentUser) {
      clearSession()
    }
  }, [clearSession, currentUser, data, isLoading, token])

  useEffect(() => {
    if (data && data !== currentUser) {
      setUser(data)
    }
  }, [currentUser, data, setUser])

  const user = data ?? currentUser

  return {
    user: user ?? null,
    isAuthenticated: !!user,
    isLoading: !!token && isLoading,
  }
}

export function useLogin(){
  const queryClient = useQueryClient()
  const setSession = useAuthStore((s) => s.setSession)
  const setUser = useAuthStore((s) => s.setUser)
  const clearSession = useAuthStore((s) => s.clearSession)

  return useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      const res = await api.post<LoginResponse>('/api/auth/login', credentials)
      return res.data.data
    },
    onSuccess: async (tokens) => {
      setSession(tokens)

      const user = await queryClient.fetchQuery({
        queryKey: currentUserKey,
        queryFn: fetchCurrentUser,
        staleTime: 0,
      })

      if (user) {
        setUser(user)
        queryClient.setQueryData(currentUserKey, user)
      } else {
        clearSession()
      }
    },
  })
}

export function useRegister() {
  return useMutation({
    mutationFn: async (payload: RegisterInput) => {
      const res = await api.post<RegisterResponse>('/api/auth/register', payload)
      return res.data.data
    },
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  const clearSession = useAuthStore((s) => s.clearSession)

  return () => {
    clearSession()
    queryClient.clear()
    window.location.href = '/login'
  }
}
