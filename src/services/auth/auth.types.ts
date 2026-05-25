import type { Role } from '@/auth/permissions';

/** Backend response for POST /auth/login and /auth/refresh (camelCase wrapper). */
export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  refreshExpiresIn: number;
}

/** Wire shape returned by the gateway — snake_case. Translated to TokenResponse at the boundary. */
export interface TokenResponseWire {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  refresh_expires_in: number;
}

/** GET /auth/me payload (snake_case keycloak_user_id on the wire). */
export interface MeResponseWire {
  sub: string;
  email: string;
  role: Role;
  keycloak_user_id: string;
}

export interface AuthUser {
  sub: string;
  email: string;
  role: Role;
  keycloakUserId: string;
}

export interface ValidateResponseWire {
  valid: boolean;
  user: MeResponseWire;
}

export interface LoginInput {
  email: string;
  password: string;
}
