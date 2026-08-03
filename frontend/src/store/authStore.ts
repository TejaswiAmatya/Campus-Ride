import { create } from "zustand";
import type { AuthUser } from "@/features/auth/types";
import { applySupabaseSession, clearSupabaseSession } from "@/lib/supabase";

interface SessionTokens {
  access_token: string;
  refresh_token: string;
}

export interface AuthErrorState {
  code: string;
  message: string;
  suspendedUntil?: string | null;
}

interface AuthState {
  // Data - what we want to keep track of
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  authError: AuthErrorState | null;
  mustChangePassword: boolean;

  // Actions - what can update the state
  setSession: (tokens: SessionTokens) => void;
  setUser: (user: AuthUser | null) => void;
  setAuthError: (error: AuthErrorState | null) => void;
  clearSession: () => void;
}

const initialAccess = localStorage.getItem("access_token");
const initialRefresh = localStorage.getItem("refresh_token");

if (initialAccess && initialRefresh) {
  void applySupabaseSession({
    access_token: initialAccess,
    refresh_token: initialRefresh,
  }).catch((error) => {
    // Remove stale tokens from other Supabase projects or expired sessions.
    console.warn("[authStore] Failed to bootstrap Supabase session", error);
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    void clearSupabaseSession().catch(() => {});
  });
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: initialAccess,
  refreshToken: initialRefresh,
  isAuthenticated: !!initialAccess,
  authError: null,
  mustChangePassword: false,

  setSession: ({ access_token, refresh_token }) => {
    localStorage.setItem("access_token", access_token);
    localStorage.setItem("refresh_token", refresh_token);
    void applySupabaseSession({ access_token, refresh_token }).catch((error) => {
      console.warn("[authStore] Failed to sync Supabase session", error);
    });
    set({
      accessToken: access_token,
      refreshToken: refresh_token,
      isAuthenticated: true,
      authError: null,
    });
  },

  setUser: (user) => {
    set((state) => ({
      user,
      isAuthenticated: !!state.accessToken && !!user,
      authError: user ? null : state.authError,
      mustChangePassword: user?.mustChangePassword ?? false,
    }));
  },

  setAuthError: (authError) => {
    set({ authError });
  },

  clearSession: () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    void clearSupabaseSession().catch(() => {});
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      authError: null,
      mustChangePassword: false,
    });
  },
}));
