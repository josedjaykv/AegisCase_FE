export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export type ApiErrorPayload = {
  statusCode: number;
  timestamp: string;
  path: string;
  message: string | { message: string[]; error: string; statusCode: number };
};

export interface NormalizedApiError {
  status: number;
  message: string;
  fieldErrors?: Record<string, string[]>;
}
