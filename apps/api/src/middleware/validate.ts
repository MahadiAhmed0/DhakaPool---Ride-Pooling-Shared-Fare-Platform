// Checks a request body against a shared Zod schema before the controller runs (NFR-SEC-04).
// Invalid input becomes a 400 VALIDATION_ERROR (via the error handler); valid input replaces req.body.
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { z } from 'zod';

export function validateBody(schema: z.ZodType): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    req.body = schema.parse(req.body ?? {});
    next();
  };
}
