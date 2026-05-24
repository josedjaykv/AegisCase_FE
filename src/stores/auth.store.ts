import { create } from 'zustand';
import type { Role } from '@/auth/permissions';

export interface AuthUser {
  sub: string;
  email: string;
  role: Role;
  keycloakUserId: string;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  /**
   * Phase 0 only: lets the dev switch the "current role" without real auth,
   * so the role-aware sidebar can be visually verified. Phase 1 replaces this
   * with real Keycloak login + GET /auth/me hydration.
   */
  setPreviewRole: (role: Role) => void;
}

const PREVIEW_USERS: Record<Role, AuthUser> = {
  ADMIN: {
    sub: 'preview-admin',
    email: 'admin@aegiscase.local',
    role: 'ADMIN',
    keycloakUserId: 'preview-admin',
  },
  DETECTIVE: {
    sub: 'preview-detective',
    email: 'detective@aegiscase.local',
    role: 'DETECTIVE',
    keycloakUserId: 'preview-detective',
  },
  ANALYST: {
    sub: 'preview-analyst',
    email: 'analyst@aegiscase.local',
    role: 'ANALYST',
    keycloakUserId: 'preview-analyst',
  },
};

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  refreshToken: null,
  user: PREVIEW_USERS.DETECTIVE,
  setPreviewRole: (role) => set({ user: PREVIEW_USERS[role] }),
}));
