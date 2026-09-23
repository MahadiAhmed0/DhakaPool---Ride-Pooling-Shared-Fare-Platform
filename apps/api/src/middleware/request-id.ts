// Gives every request an id, returned in the X-Request-Id header and in error responses,
// so any response can be matched to its log line (NFR-REL-01).
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

// Accept the caller's id only if it is short and plain; otherwise create a new one.
const SAFE_REQUEST_ID = /^[A-Za-z0-9._-]{1,64}$/;

export function requestId(req: Request, res: Response, next: NextFunction): void {
  const incomingId = req.get('x-request-id');
  const id = incomingId && SAFE_REQUEST_ID.test(incomingId) ? incomingId : randomUUID();
  req.id = id;
  res.setHeader('X-Request-Id', id);
  next();
}
