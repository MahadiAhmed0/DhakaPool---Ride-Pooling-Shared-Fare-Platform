// HTTP handlers for accounts. They read the validated body, call the service and set the cookie.
import type { LogInInput, SignUpInput } from '@dhakapool/shared';
import type { Request, Response } from 'express';
import { getCurrentUser, logIn, logOut, signUp } from './auth.service.ts';
import { clearSessionCookie, SESSION_COOKIE_NAME, setSessionCookie } from './session-cookie.ts';

// POST /api/auth/signup — creates the passenger and signs them in straight away.
export async function postSignUp(req: Request, res: Response): Promise<void> {
  const signedIn = await signUp(req.body as SignUpInput);
  setSessionCookie(res, signedIn.sessionToken, signedIn.expiresAt);
  res.status(201).json({ user: signedIn.user });
}

// POST /api/auth/login
export async function postLogIn(req: Request, res: Response): Promise<void> {
  const signedIn = await logIn(req.body as LogInInput);
  setSessionCookie(res, signedIn.sessionToken, signedIn.expiresAt);
  res.status(200).json({ user: signedIn.user });
}

// POST /api/auth/logout — safe to call even when already signed out.
export async function postLogOut(req: Request, res: Response): Promise<void> {
  const sessionToken: unknown = req.cookies?.[SESSION_COOKIE_NAME];
  if (typeof sessionToken === 'string' && sessionToken.length > 0) {
    await logOut(sessionToken);
  }
  clearSessionCookie(res);
  res.status(204).end();
}

// GET /api/auth/me — the signed-in user's own profile (FR-AUTH-04).
export async function getMe(req: Request, res: Response): Promise<void> {
  res.status(200).json({ user: await getCurrentUser(req.user!.id) });
}
