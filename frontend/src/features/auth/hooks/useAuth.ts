import { useEffect } from 'react'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { api, extractApiError, fetchMe } from '@/api/client'
import { useAuthStore, type AuthErrorState } from '@/store/authStore'
import { meQueryKey } from '@/features/user/hooks/useProfile'
import type { AuthUser, RegisterInput } from '@/features/auth/types'

interface LoginResponse {
  data: {
    access_token: string
    refresh_token: string
  }
}

type SessionTokens = LoginResponse['data']

interface RegisterResponse {
  data: {
    email: string
    requiresEmailConfirmation: boolean
  }
}

interface ConfirmSignupResponse {
  data: {
    email: string
    status: 'confirmed'
  }
}

function parseConfirmSignupResponse(res: ConfirmSignupResponse) {
  return res.data
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
  const setAuthError = useAuthStore((state) => state.setAuthError)
  const authError = useAuthStore((state) => state.authError)

  // Fetch the current user profile if we have an access token but no user in the store.
  const { data, error, isLoading } = useQuery<AuthUser>({
    queryKey: meQueryKey,
    queryFn: fetchMe,
    enabled: !!token,
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  useEffect(() => {
    if (!token || isLoading || !error) {
      return
    }

    const authError = extractApiError(error)
    clearSession()
    setAuthError(authError)
  }, [clearSession, error, isLoading, setAuthError, token])

  useEffect(() => {
    if (data && data !== currentUser) {
      setUser(data)
    }
  }, [currentUser, data, setUser])

  useEffect(() => {
    if (token && !error) {
      setAuthError(null)
    }
  }, [error, setAuthError, token])

  const user = token ? data ?? currentUser : null

  return {
    user: user ?? null,
    isAuthenticated: !!user,
    isLoading: !!token && isLoading,
    authError,
  }
}

export function useLogin(){
  const queryClient = useQueryClient()
  const setSession = useAuthStore((s) => s.setSession)
  const setUser = useAuthStore((s) => s.setUser)
  const clearSession = useAuthStore((s) => s.clearSession)
  const setAuthError = useAuthStore((s) => s.setAuthError)

  return useMutation<SessionTokens, AuthErrorState, { email: string; password: string }>({
    onMutate: () => {
      setAuthError(null)
    },
    mutationFn: async (credentials: { email: string; password: string }) => {
      try {
        const res = await api.post<LoginResponse>('/api/auth/login', credentials)
        return res.data.data
      } catch (error) {
        throw extractApiError(error)
      }
    },
    onSuccess: async (tokens) => {
      setSession(tokens)

      let user: AuthUser | null = null
      try {
        user = await queryClient.fetchQuery({
          queryKey: meQueryKey,
          queryFn: fetchMe,
          staleTime: 0,
        })
      } catch (error) {
        const parsedError = extractApiError(error)
        clearSession()
        setAuthError(parsedError)
        throw parsedError
      }

      if (user) {
        setUser(user)
        queryClient.setQueryData(meQueryKey, user)
      } else {
        clearSession()
      }
    },
    onError: (error) => {
      setAuthError(error)
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

export function useConfirmSignup() {
  return useMutation({
    mutationFn: async ({ tokenHash }: { tokenHash: string }) => {
      const res = await api.post<ConfirmSignupResponse>('/api/auth/confirm-signup', {
        tokenHash,
      })
      return parseConfirmSignupResponse(res.data)
    },
  })
}

export function useConfirmSignupSession() {
  return useMutation({
    mutationFn: async ({ accessToken }: { accessToken: string }) => {
      const res = await api.post<ConfirmSignupResponse>('/api/auth/confirm-signup/session', {
        accessToken,
      })
      return parseConfirmSignupResponse(res.data)
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
