// Routes of the drivers module (SRS §8.2). Every route is for signed-in drivers only.
import { availabilitySchema } from '@dhakapool/shared';
import { Router } from 'express';
import { requireRole } from '../../middleware/require-auth.ts';
import { validateBody } from '../../middleware/validate.ts';
import {
  getAvailability,
  getRequests,
  postAcceptRequest,
  putAvailability,
} from './drivers.controller.ts';

export const driversRouter = Router();

driversRouter.use(requireRole('DRIVER'));
driversRouter.get('/availability', getAvailability);
driversRouter.put('/availability', validateBody(availabilitySchema), putAvailability);
driversRouter.get('/requests', getRequests);
driversRouter.post('/requests/:id/accept', postAcceptRequest);
