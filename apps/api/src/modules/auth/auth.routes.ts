// Routes of the auth module (SRS §8.2). Sign-up, sign-in and sign-out are public; /me needs a session.
import { logInSchema, signUpSchema } from '@dhakapool/shared';
import { type RequestHandler, Router } from 'express';
import { requireAuth } from '../../middleware/require-auth.ts';
import { validateBody } from '../../middleware/validate.ts';
import { getMe, postLogIn, postLogOut, postSignUp } from './auth.controller.ts';

// Sign-up and sign-in pass through the rate limiter first (NFR-SEC-07).
export function createAuthRouter(rateLimiter: RequestHandler): Router {
  const authRouter = Router();
  authRouter.post('/signup', rateLimiter, validateBody(signUpSchema), postSignUp);
  authRouter.post('/login', rateLimiter, validateBody(logInSchema), postLogIn);
  authRouter.post('/logout', postLogOut);
  authRouter.get('/me', requireAuth, getMe);
  return authRouter;
}
