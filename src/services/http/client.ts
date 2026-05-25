import axios, {
  AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';
import { env } from '@/lib/env';
import { toast } from 'sonner';
import { normalizeError } from './errors';

export const httpClient = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
});

type TokenGetter = () => string | null;
type RefreshFn = () => Promise<string | null>;
type UnauthorizedFn = () => void;

interface AuthBindings {
  getAccessToken: TokenGetter;
  refreshAccessToken: RefreshFn;
  onUnauthorized: UnauthorizedFn;
}

let bindings: AuthBindings | null = null;

export function bindAuth(b: AuthBindings) {
  bindings = b;
}

const PUBLIC_PATHS = ['/auth/login', '/auth/refresh', '/auth/logout', '/health', '/'];
const isPublic = (url?: string) =>
  !!url && PUBLIC_PATHS.some((p) => url === p || url.startsWith(`${p}?`));

httpClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (isPublic(config.url) || !bindings) return config;
  const token = bindings.getAccessToken();
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

interface RetriableConfig extends AxiosRequestConfig {
  _retried?: boolean;
}

let refreshInFlight: Promise<string | null> | null = null;

httpClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined;
    const status = error.response?.status;

    // 429: surface a toast; let TanStack Query retry policy own the back-off.
    if (status === 429) {
      toast.warning('Too many requests. Retrying shortly…');
      return Promise.reject(normalizeError(error));
    }

    if (
      status === 401 &&
      original &&
      !original._retried &&
      !isPublic(original.url) &&
      bindings
    ) {
      original._retried = true;
      refreshInFlight ??= bindings.refreshAccessToken().finally(() => {
        refreshInFlight = null;
      });

      const fresh = await refreshInFlight;
      if (fresh) {
        original.headers = { ...(original.headers ?? {}), Authorization: `Bearer ${fresh}` };
        return httpClient.request(original);
      }
      bindings.onUnauthorized();
      return Promise.reject(normalizeError(error));
    }

    if (status === 403) {
      toast.error("You don't have permission for this action");
    }

    if (status === 503) {
      toast.error('A required service is unavailable. Try again shortly.');
    }

    return Promise.reject(normalizeError(error));
  },
);
