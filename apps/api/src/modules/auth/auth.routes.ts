// Routes of the auth module (SRS §8.2). Sign-up and sign-in are public.
import { logInSchema, signUpSchema } from '@dhakapool/shared';
import { Router } from 'express';
import { validateBody } from '../../middleware/validate.ts';
import { postLogIn, postSignUp } from './auth.controller.ts';

export const authRouter = Router();

authRouter.post('/signup', validateBody(signUpSchema), postSignUp);
authRouter.post('/login', validateBody(logInSchema), postLogIn);
