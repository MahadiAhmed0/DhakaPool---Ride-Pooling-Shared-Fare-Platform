// Routes of the auth module (SRS §8.2). Sign-up, sign-in and sign-out are public; /me needs a session.
import { logInSchema, signUpSchema } from '@dhakapool/shared';
import { Router } from 'express';
import { requireAuth } from '../../middleware/require-auth.ts';
import { validateBody } from '../../middleware/validate.ts';
import { getMe, postLogIn, postLogOut, postSignUp } from './auth.controller.ts';

export const authRouter = Router();

authRouter.post('/signup', validateBody(signUpSchema), postSignUp);
authRouter.post('/login', validateBody(logInSchema), postLogIn);
authRouter.post('/logout', postLogOut);
authRouter.get('/me', requireAuth, getMe);
