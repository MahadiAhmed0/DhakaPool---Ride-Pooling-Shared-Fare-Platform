// Limits how often one IP address may try to sign up or sign in (NFR-SEC-07).
// Counts are kept in memory, which is enough for one API instance (ARCHITECTURE §8).
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import { RateLimitedError } from '../domain/errors.ts';

const ONE_MINUTE_MS = 60 * 1000;

export function createAuthRateLimiter(attemptsPerMinute: number): RequestHandler {
  return rateLimit({
    windowMs: ONE_MINUTE_MS,
    limit: attemptsPerMinute,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    // Answer with the standard error JSON instead of the library's plain-text message.
    handler: (_req: Request, _res: Response, next: NextFunction) => next(new RateLimitedError()),
  });
}
