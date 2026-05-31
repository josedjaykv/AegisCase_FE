import type { Breadcrumb, ErrorEvent } from '@sentry/browser';
import { env } from './env';

/**
 * Lazily initialize Sentry — only when VITE_SENTRY_DSN is set. The SDK is
 * dynamically imported so it adds **zero** bundle cost when Sentry is disabled
 * (the common case in dev). Fire-and-forget from main.tsx.
 *
 * `import type` above is erased at build time, so it does not pull the SDK into
 * the bundle.
 *
 * Privacy (architecture.md §3 / law-enforcement context): we never ship PII or
 * the JWT. We strip Authorization headers, token-ish values, cookies and emails
 * from events and breadcrumbs, and disable performance tracing.
 */
let started = false;

export async function initSentry(): Promise<void> {
  if (started || !env.sentryDsn) return;
  started = true;

  const Sentry = await import('@sentry/browser');

  Sentry.init({
    dsn: env.sentryDsn,
    environment: env.environment,
    tracesSampleRate: 0, // no performance tracing
    sendDefaultPii: false,
    beforeBreadcrumb: (crumb: Breadcrumb) => {
      if (crumb.category === 'console') return null; // drop console noise
      if (crumb.data && typeof crumb.data === 'object') {
        crumb.data = scrub(crumb.data as Record<string, unknown>);
      }
      return crumb;
    },
    beforeSend: (event: ErrorEvent) => scrubEvent(event),
  });
}

/** Report a caught error (e.g. from the ErrorBoundary) without leaking context. */
export async function captureError(
  error: unknown,
  context?: Record<string, unknown>,
): Promise<void> {
  if (!env.sentryDsn) return;
  const Sentry = await import('@sentry/browser');
  Sentry.captureException(error, context ? { extra: scrub(context) } : undefined);
}

const SENSITIVE_KEY = /token|authorization|cookie|password|secret|email|jwt/i;
const JWT_LIKE = /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g;
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

function scrubString(value: string): string {
  return value.replace(JWT_LIKE, '[redacted-jwt]').replace(EMAIL, '[redacted-email]');
}

function scrub(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (SENSITIVE_KEY.test(key)) {
      out[key] = '[redacted]';
    } else if (typeof val === 'string') {
      out[key] = scrubString(val);
    } else if (val && typeof val === 'object' && !Array.isArray(val)) {
      out[key] = scrub(val as Record<string, unknown>);
    } else {
      out[key] = val;
    }
  }
  return out;
}

function scrubEvent(event: ErrorEvent): ErrorEvent {
  const headers = event.request?.headers;
  if (headers) {
    for (const key of Object.keys(headers)) {
      if (SENSITIVE_KEY.test(key)) headers[key] = '[redacted]';
    }
  }
  if (event.request) delete event.request.cookies;
  // Never ship the user object (sub / email).
  delete event.user;
  return event;
}
