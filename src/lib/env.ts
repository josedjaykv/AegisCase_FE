export const env = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000',
  sentryDsn: import.meta.env.VITE_SENTRY_DSN ?? '',
  environment: import.meta.env.VITE_ENV ?? 'development',
  isDev: import.meta.env.DEV,
} as const;
