// Reads the session cookie on every request and, when it belongs to an active session, sets req.user.
// It never rejects a request itself: routes that need a signed-in user add requireAuth.
import type { NextFunction, Request, Response } from 'express';
import { findSignedInUser } from '../modules/auth/auth.service.ts';
import { SESSION_COOKIE_NAME } from '../modules/auth/session-cookie.ts';

export async function loadSession(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const sessionToken: unknown = req.cookies?.[SESSION_COOKIE_NAME];
  if (typeof sessionToken === 'string' && sessionToken.length > 0) {
    req.user = (await findSignedInUser(sessionToken)) ?? undefined;
  }
  next();
}
