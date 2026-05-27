import { httpClient } from '@/services/http/client';
import type {
  AuthUser,
  LoginInput,
  MeResponseWire,
  TokenResponse,
  TokenResponseWire,
} from './auth.types';

function toTokenResponse(w: TokenResponseWire): TokenResponse {
  return {
    accessToken: w.access_token,
    refreshToken: w.refresh_token,
    tokenType: w.token_type,
    expiresIn: w.expires_in,
    refreshExpiresIn: w.refresh_expires_in,
  };
}

function toAuthUser(w: MeResponseWire): AuthUser {
  return {
    sub: w.sub,
    email: w.email,
    role: w.role,
    keycloakUserId: w.keycloak_user_id,
  };
}

export const authApi = {
  async login(input: LoginInput): Promise<TokenResponse> {
    const { data } = await httpClient.post<TokenResponseWire>('/auth/login', input);
    return toTokenResponse(data);
  },

  async refresh(refreshToken: string): Promise<TokenResponse> {
    const { data } = await httpClient.post<TokenResponseWire>('/auth/refresh', {
      refresh_token: refreshToken,
    });
    return toTokenResponse(data);
  },

  async logout(refreshToken: string): Promise<void> {
    await httpClient.post('/auth/logout', { refresh_token: refreshToken });
  },

  async me(): Promise<AuthUser> {
    const { data } = await httpClient.get<MeResponseWire>('/auth/me');
    return toAuthUser(data);
  },
};
