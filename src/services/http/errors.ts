import { AxiosError, isAxiosError } from 'axios';
import type { ApiErrorPayload, NormalizedApiError } from '@/types/api';

/**
 * Normalize an arbitrary error (axios or otherwise) into the FE's
 * NormalizedApiError shape. Backend envelope is documented in
 * docs/architecture/architecture.md §3.
 */
export function normalizeError(error: unknown): NormalizedApiError {
  if (isAxiosError(error)) return fromAxios(error);
  if (error instanceof Error) return { status: 0, message: error.message };
  return { status: 0, message: 'Unknown error' };
}

function fromAxios(error: AxiosError<ApiErrorPayload>): NormalizedApiError {
  if (!error.response) {
    return { status: 0, message: error.message || 'Network error' };
  }

  const { status } = error.response;
  const payload = error.response.data;
  const rawMessage = payload?.message;

  if (typeof rawMessage === 'string') {
    return { status, message: rawMessage };
  }

  if (rawMessage && typeof rawMessage === 'object') {
    if (Array.isArray(rawMessage.message)) {
      return {
        status,
        message: rawMessage.error ?? 'Validation error',
        fieldErrors: groupFieldErrors(rawMessage.message),
      };
    }
    // Backend's AllExceptionsFilter nests the user-facing string at
    // `body.message.message` for non-validation errors (e.g. 503, business
    // 400). Prefer it over axios' generic error.message.
    if (typeof rawMessage.message === 'string') {
      return { status, message: rawMessage.message };
    }
  }

  return { status, message: error.message || 'Request failed' };
}

/**
 * NestJS validation errors arrive as `"<field> <constraint message>"`. Group
 * by the first token (best-effort) so RHF setError can target each field.
 */
function groupFieldErrors(messages: string[]): Record<string, string[]> {
  return messages.reduce<Record<string, string[]>>((acc, msg) => {
    const [field] = msg.split(' ');
    if (!field) return acc;
    (acc[field] ??= []).push(msg);
    return acc;
  }, {});
}

export function isNormalizedApiError(value: unknown): value is NormalizedApiError {
  return typeof value === 'object' && value !== null && 'status' in value && 'message' in value;
}
