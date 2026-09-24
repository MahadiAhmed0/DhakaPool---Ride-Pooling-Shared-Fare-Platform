// Routes of the pools module (SRS §8.2): the driver's commands on their own trip. Only the driver
// who owns the trip may use them; anyone else's trip answers 404 (NFR-SEC-03).
import { Router } from 'express';
import { requireRole } from '../../middleware/require-auth.ts';
import {
  postArrive,
  postCashCollected,
  postCancelTrip,
  postDropOff,
  postNoShow,
  postStart,
} from './pools.controller.ts';

export const poolsRouter = Router();

poolsRouter.use(requireRole('DRIVER'));
poolsRouter.post('/:id/arrive', postArrive);
poolsRouter.post('/:id/start', postStart);
poolsRouter.post('/:id/cancel', postCancelTrip);
poolsRouter.post('/:id/members/:rideId/complete', postDropOff);
poolsRouter.post('/:id/members/:rideId/no-show', postNoShow);
poolsRouter.post('/:id/members/:rideId/cash-collected', postCashCollected);
