// HTTP handlers for accounts. They read the validated body, call the service and set the cookie.
import type { LogInInput, SignUpInput } from '@dhakapool/shared';
import type { Request, Response } from 'express';
import { logIn, signUp } from './auth.service.ts';
import { setSessionCookie } from './session-cookie.ts';

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
