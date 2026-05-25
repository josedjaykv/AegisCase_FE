import { useEffect, useRef, type ReactNode } from 'react';
import { authApi } from '@/services/auth/auth.api';
import { bindAuth } from '@/services/http/client';
import { readPersistedRefresh, useAuthStore } from '@/stores/auth.store';

const REFRESH_BUFFER_MS = 30_000;

/**
 * Bootstraps the auth session and wires the axios client to the auth store.
 * On mount, attempts to recover a session using the refresh token previously
 * mirrored to sessionStorage (per docs/architecture/auth.md §2).
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const setSession = useAuthStore((s) => s.setSession);
  const updateTokens = useAuthStore((s) => s.updateTokens);
  const clear = useAuthStore((s) => s.clear);
  const setBootstrapping = useAuthStore((s) => s.setBootstrapping);

  const bootstrappedRef = useRef(false);

  useEffect(() => {
    bindAuth({
      getAccessToken: () => useAuthStore.getState().accessToken,
      refreshAccessToken: async () => {
        const rt = useAuthStore.getState().refreshToken ?? readPersistedRefresh();
        if (!rt) return null;
        try {
          const tokens = await authApi.refresh(rt);
          updateTokens(tokens);
          return tokens.accessToken;
        } catch {
          clear();
          return null;
        }
      },
      onUnauthorized: () => clear(),
    });

    if (bootstrappedRef.current) return;
    bootstrappedRef.current = true;

    const rt = readPersistedRefresh();
    if (!rt) {
      setBootstrapping(false);
      return;
    }

    (async () => {
      try {
        const tokens = await authApi.refresh(rt);
        updateTokens(tokens);
        const user = await authApi.me();
        setSession(tokens, user);
      } catch {
        clear();
      } finally {
        setBootstrapping(false);
      }
    })();
  }, [setSession, updateTokens, clear, setBootstrapping]);

  // Proactive refresh: when the tab regains focus within 30 s of expiry, refresh ahead of time.
  useEffect(() => {
    const handler = async () => {
      if (document.visibilityState !== 'visible') return;
      const { accessExpiresAt, refreshToken } = useAuthStore.getState();
      if (!accessExpiresAt || !refreshToken) return;
      if (accessExpiresAt - Date.now() > REFRESH_BUFFER_MS) return;
      try {
        const tokens = await authApi.refresh(refreshToken);
        updateTokens(tokens);
      } catch {
        clear();
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [updateTokens, clear]);

  return <>{children}</>;
}
