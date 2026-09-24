// Turns every error into the standard error JSON (SRS §8.2, NFR-REL-01).
// Unexpected errors are logged in full but reach the client only as a generic message (NFR-SEC-09).
import type { NextFunction, Request, Response } from 'express';
import { type z, ZodError } from 'zod';
import { mapDatabaseError } from '../db/errors.ts';
import { AppError, InternalError, ValidationError } from '../domain/errors.ts';

type BodyParserError = { type?: string };

// 409: not allowed in the current state. 422: not allowed by a business rule (SRS §8.2).
const REJECTED_COMMAND_STATUSES = new Set([409, 422]);

function isBodyParserError(error: unknown, type: string): boolean {
  return typeof error === 'object' && error !== null && (error as BodyParserError).type === type;
}

type FieldProblem = { path: string; message: string };

// An unexpected field is reported under its own name, so the client can see which one to remove.
function toFieldProblems(issue: z.core.$ZodIssue): FieldProblem[] {
  if (issue.code === 'unrecognized_keys') {
    return issue.keys.map((key) => ({
      path: [...issue.path, key].join('.'),
      message: `The field "${key}" is not expected here.`,
    }));
  }
  return [{ path: issue.path.join('.'), message: issue.message }];
}

function toAppError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }
  const databaseError = mapDatabaseError(error);
  if (databaseError) {
    return databaseError;
  }
  if (error instanceof ZodError) {
    const fields = error.issues.flatMap(toFieldProblems);
    return new ValidationError('Some fields are missing or not valid.', { fields });
  }
  if (isBodyParserError(error, 'entity.parse.failed')) {
    return new ValidationError('The request body is not valid JSON.');
  }
  if (isBodyParserError(error, 'entity.too.large')) {
    return new ValidationError('The request body is too large.');
  }
  return new InternalError();
}

export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const appError = toAppError(error);
  if (appError instanceof InternalError) {
    req.log.error({ err: error }, 'Unexpected error');
  }
  // FR-HIST-03, NFR-OBS-02: a refused command (409 or 422) is logged at WARN with its code.
  // The request log line already carries the request id and the user id.
  if (REJECTED_COMMAND_STATUSES.has(appError.httpStatus)) {
    req.log.warn(
      { event: 'command.rejected', code: appError.code, actorRole: req.user?.role },
      appError.message,
    );
  }
  res.status(appError.httpStatus).json({
    error: { code: appError.code, message: appError.message, details: appError.details },
    requestId: req.id,
  });
}
