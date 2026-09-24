// The error codes the API can answer with (SRS §8.2), shared so the web app can react to them.
// Every error body looks like { error: { code, message, details }, requestId }.
export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'INVALID_STATE_TRANSITION'
  | 'CAPACITY_EXCEEDED'
  | 'ACTIVE_REQUEST_EXISTS'
  | 'ACTIVE_POOL_EXISTS'
  | 'POOL_NOT_OPEN'
  | 'DRIVER_OFFLINE'
  | 'CONFLICT'
  | 'NOT_COMPATIBLE'
  | 'INSUFFICIENT_BALANCE'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR'
  | 'SERVICE_UNAVAILABLE';

export type ApiErrorBody = {
  error: { code: ApiErrorCode; message: string; details?: Record<string, unknown> };
  requestId: string;
};
