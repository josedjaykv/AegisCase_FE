import { create } from 'zustand';
import type { AuthUser, TokenResponse } from '@/services/auth/auth.types';

const REFRESH_STORAGE_KEY = 'aegiscase:rt';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  /** UNIX ms timestamp at which the access token expires. */
  accessExpiresAt: number | null;
  user: AuthUser | null;
  /** True until AuthProvider has finished its initial hydration attempt. */
  bootstrapping: boolean;

  setSession: (tokens: TokenResponse, user: AuthUser) => void;
  updateTokens: (tokens: TokenResponse) => void;
  setUser: (user: AuthUser) => void;
  clear: () => void;
  setBootstrapping: (value: boolean) => void;
}

function persistRefresh(refreshToken: string | null) {
  try {
    if (refreshToken) sessionStorage.setItem(REFRESH_STORAGE_KEY, refreshToken);
    else sessionStorage.removeItem(REFRESH_STORAGE_KEY);
  } catch {
    // sessionStorage may be unavailable (e.g. private mode); fail silently
  }
}

export function readPersistedRefresh(): string | null {
  try {
    return sessionStorage.getItem(REFRESH_STORAGE_KEY);
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  refreshToken: null,
  accessExpiresAt: null,
  user: null,
  bootstrapping: true,

  setSession: (tokens, user) => {
    persistRefresh(tokens.refreshToken);
    set({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      accessExpiresAt: Date.now() + tokens.expiresIn * 1000,
      user,
      bootstrapping: false,
    });
  },

  updateTokens: (tokens) => {
    persistRefresh(tokens.refreshToken);
    set({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      accessExpiresAt: Date.now() + tokens.expiresIn * 1000,
    });
  },

  setUser: (user) => set({ user }),

  clear: () => {
    persistRefresh(null);
    set({
      accessToken: null,
      refreshToken: null,
      accessExpiresAt: null,
      user: null,
      bootstrapping: false,
    });
  },

  setBootstrapping: (value) => set({ bootstrapping: value }),
}));
