import { beforeEach, describe, expect, it } from 'vitest';
import { readPersistedRefresh, useAuthStore } from './auth.store';

const sampleTokens = {
  accessToken: 'access-1',
  refreshToken: 'refresh-1',
  tokenType: 'Bearer',
  expiresIn: 300,
  refreshExpiresIn: 1800,
};

const sampleUser = {
  sub: 'sub-1',
  email: 'detective@aegiscase.com',
  role: 'DETECTIVE' as const,
  keycloakUserId: 'sub-1',
};

describe('auth.store', () => {
  beforeEach(() => {
    useAuthStore.getState().clear();
    useAuthStore.getState().setBootstrapping(true);
  });

  it('starts with no session and bootstrapping=true', () => {
    const s = useAuthStore.getState();
    expect(s.user).toBeNull();
    expect(s.accessToken).toBeNull();
    expect(s.bootstrapping).toBe(true);
  });

  it('setSession persists refresh token and clears bootstrapping', () => {
    useAuthStore.getState().setSession(sampleTokens, sampleUser);
    const s = useAuthStore.getState();
    expect(s.accessToken).toBe('access-1');
    expect(s.user?.email).toBe('detective@aegiscase.com');
    expect(s.bootstrapping).toBe(false);
    expect(readPersistedRefresh()).toBe('refresh-1');
  });

  it('clear removes tokens and persisted refresh', () => {
    useAuthStore.getState().setSession(sampleTokens, sampleUser);
    useAuthStore.getState().clear();
    expect(useAuthStore.getState().user).toBeNull();
    expect(readPersistedRefresh()).toBeNull();
  });
});
