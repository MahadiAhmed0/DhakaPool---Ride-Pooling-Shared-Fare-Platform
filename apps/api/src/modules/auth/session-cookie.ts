// The session cookie: httpOnly (scripts cannot read it), SameSite=Lax (not sent by other sites'
// forms) and Secure in production (HTTPS only) — NFR-SEC-06, ADR-0005.
import type { Response } from 'express';
import { env } from '../../config/env.ts';

export const SESSION_COOKIE_NAME = 'dtp_session';

export function setSessionCookie(res: Response, token: string, expiresAt: Date): void {
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.COOKIE_SECURE,
    path: '/',
    expires: expiresAt,
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.COOKIE_SECURE,
    path: '/',
  });
}
