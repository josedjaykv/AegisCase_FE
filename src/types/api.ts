export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Backend uniform error envelope. The shared `AllExceptionsFilter` may
 * surface `message` either as:
 *   - a plain string (most routes), or
 *   - a nested object whose own `message` is either a string (business
 *     rule / framework error like 503) or a string[] (class-validator
 *     field errors on 400).
 * `services/http/errors.ts` normalizes all three shapes.
 */
export type ApiErrorPayload = {
  statusCode: number;
  timestamp: string;
  path: string;
  message:
    | string
    | {
        message: string | string[];
        error?: string;
        statusCode?: number;
      };
};

export interface NormalizedApiError {
  status: number;
  message: string;
  fieldErrors?: Record<string, string[]>;
}
