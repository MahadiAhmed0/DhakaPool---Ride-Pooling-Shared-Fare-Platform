// Routes of the rides module (SRS §8.2). Every route is for signed-in passengers only, and each one
// only ever touches the passenger's own rides (NFR-SEC-03).
import { rideRequestSchema } from '@dhakapool/shared';
import { Router } from 'express';
import { requireRole } from '../../middleware/require-auth.ts';
import { validateBody } from '../../middleware/validate.ts';
import { getRide, getRides, postRide } from './rides.controller.ts';

export const ridesRouter = Router();

ridesRouter.use(requireRole('PASSENGER'));
ridesRouter.post('/', validateBody(rideRequestSchema), postRide);
ridesRouter.get('/', getRides);
ridesRouter.get('/:id', getRide);
