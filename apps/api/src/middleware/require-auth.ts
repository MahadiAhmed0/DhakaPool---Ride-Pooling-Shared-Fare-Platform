// Route guards (NFR-SEC-02, NFR-SEC-03, FR-AUTH-05).
// requireAuth: the caller must be signed in (else 401).
// requireRole: the caller must also have the given role (else 403) — e.g. passengers cannot use driver routes.
import type { UserRole } from '@dhakapool/shared';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { ForbiddenError, UnauthenticatedError } from '../domain/errors.ts';

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    throw new UnauthenticatedError();
  }
  next();
}

export function requireRole(role: UserRole): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthenticatedError();
    }
    if (req.user.role !== role) {
      throw new ForbiddenError(`Only ${role.toLowerCase()}s can do this.`);
    }
    next();
  };
}
