// Talks to the API. The browser only ever calls /api on the web app's own address; Next.js forwards
// it to the API, so the session cookie stays first-party (ADR-0005). Every API error has the same
// JSON shape (SRS §8.2), which becomes an ApiError with a readable message.
import type { ApiErrorBody, ApiErrorCode } from '@dhakapool/shared';

export type FieldProblem = { path: string; message: string };

export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode | 'NETWORK_ERROR';
  readonly details: Record<string, unknown>;

  constructor(
    status: number,
    code: ApiError['code'],
    message: string,
    details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  // Field-by-field problems of a 400 VALIDATION_ERROR, for showing next to each form field.
  get fields(): FieldProblem[] {
    const fields = this.details['fields'];
    return Array.isArray(fields) ? (fields as FieldProblem[]) : [];
  }
}

type ErrorBody = Partial<ApiErrorBody>;

const NETWORK_MESSAGE = 'We could not reach Dhaka Tesla Pool. Check your connection and try again.';

async function toApiError(response: Response): Promise<ApiError> {
  const body = (await response.json().catch(() => ({}))) as ErrorBody;
  const message = body.error?.message ?? 'Something went wrong. Please try again.';
  return new ApiError(
    response.status,
    body.error?.code ?? 'INTERNAL_ERROR',
    message,
    body.error?.details,
  );
}

type Method = 'GET' | 'POST' | 'PUT';

async function send<T>(method: Method, path: string, body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      headers: body === undefined ? undefined : { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: 'no-store',
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', NETWORK_MESSAGE);
  }
  if (!response.ok) {
    throw await toApiError(response);
  }
  // 204 No Content (for example sign-out) has no body.
  return (response.status === 204 ? undefined : await response.json()) as T;
}

export const api = {
  get: <T>(path: string): Promise<T> => send<T>('GET', path),
  post: <T>(path: string, body?: unknown): Promise<T> => send<T>('POST', path, body ?? {}),
  put: <T>(path: string, body: unknown): Promise<T> => send<T>('PUT', path, body),
};
