import { create } from 'zustand'
import type { AuthUser } from '@/hooks/useAuth'

interface SessionTokens {
  access_token: string
  refresh_token: string
}

interface AuthState {
    // Data - what we want to keep track of
    user: AuthUser | null
    accessToken: string | null
    refreshToken: string | null
    isAuthenticated: boolean

    // Actions - what can update the state
    setSession: (tokens: SessionTokens) => void
    setUser: (user: AuthUser | null) => void
    clearSession: () => void
}

const initialAccess = localStorage.getItem('access_token')
const initialRefresh = localStorage.getItem('refresh_token')

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: initialAccess,
  refreshToken: initialRefresh,
  isAuthenticated: !!initialAccess,

  setSession: ({ access_token, refresh_token }) => {
    localStorage.setItem('access_token', access_token)
    localStorage.setItem('refresh_token', refresh_token)
    set({
      accessToken: access_token,
      refreshToken: refresh_token,
      isAuthenticated: true,
    })
  },

  setUser: (user) => {
    set((state) => ({
      user,
      isAuthenticated: !!state.accessToken && !!user,
    }))
  },

  clearSession: () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    })
  },
}))