// The errors the API can return (SRS §8.2). Each has a stable code and a human-readable message.
// Services throw these; the error handler turns them into the standard error JSON.
import type { ApiErrorCode } from '@dhakapool/shared';

// The list of codes is shared with the web app.
export type ErrorCode = ApiErrorCode;

export type ConflictCode =
  | 'INVALID_STATE_TRANSITION'
  | 'CAPACITY_EXCEEDED'
  | 'ACTIVE_REQUEST_EXISTS'
  | 'ACTIVE_POOL_EXISTS'
  | 'POOL_NOT_OPEN'
  | 'DRIVER_OFFLINE'
  | 'CONFLICT';

export type UnprocessableCode = 'NOT_COMPATIBLE' | 'INSUFFICIENT_BALANCE';

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly httpStatus: number;
  readonly details?: unknown;

  constructor(code: ErrorCode, httpStatus: number, message: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.httpStatus = httpStatus;
    this.details = details;
  }
}

export class ValidationError extends AppError {
  constructor(message = 'The request is not valid.', details?: unknown) {
    super('VALIDATION_ERROR', 400, message, details);
  }
}

export class UnauthenticatedError extends AppError {
  constructor(message = 'Please sign in first.') {
    super('UNAUTHENTICATED', 401, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'You are not allowed to do this.') {
    super('FORBIDDEN', 403, message);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not found.') {
    super('NOT_FOUND', 404, message);
  }
}

export class ConflictError extends AppError {
  constructor(code: ConflictCode, message: string, details?: unknown) {
    super(code, 409, message, details);
  }
}

export class UnprocessableError extends AppError {
  constructor(code: UnprocessableCode, message: string, details?: unknown) {
    super(code, 422, message, details);
  }
}

export class RateLimitedError extends AppError {
  constructor(message = 'Too many attempts. Please wait a minute and try again.') {
    super('RATE_LIMITED', 429, message);
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message = 'The service is temporarily unavailable. Please try again shortly.') {
    super('SERVICE_UNAVAILABLE', 503, message);
  }
}

export class InternalError extends AppError {
  constructor(message = 'Something went wrong. Please try again.') {
    super('INTERNAL_ERROR', 500, message);
  }
}
