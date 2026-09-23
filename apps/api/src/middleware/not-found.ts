// Answers requests for URLs the API does not have with a standard NOT_FOUND error.
import type { NextFunction, Request, Response } from 'express';
import { NotFoundError } from '../domain/errors.ts';

export function notFound(req: Request, _res: Response, next: NextFunction): void {
  next(new NotFoundError(`There is no ${req.method} ${req.path} endpoint.`));
}
