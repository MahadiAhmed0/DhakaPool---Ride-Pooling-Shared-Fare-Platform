// Routes of the fares module (SRS §8.2). Only passengers ask for estimates.
import { fareEstimateSchema } from '@dhakapool/shared';
import { Router } from 'express';
import { requireRole } from '../../middleware/require-auth.ts';
import { validateBody } from '../../middleware/validate.ts';
import { postFareEstimate } from './fares.controller.ts';

export const faresRouter = Router();

faresRouter.post(
  '/estimate',
  requireRole('PASSENGER'),
  validateBody(fareEstimateSchema),
  postFareEstimate,
);
