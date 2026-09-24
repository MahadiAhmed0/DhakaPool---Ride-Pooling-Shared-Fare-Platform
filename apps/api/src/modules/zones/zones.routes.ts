// Routes of the zones module (SRS §8.2). Anyone signed in may read the zone list.
import { Router } from 'express';
import { requireAuth } from '../../middleware/require-auth.ts';
import { getZones } from './zones.controller.ts';

export const zonesRouter = Router();

zonesRouter.get('/', requireAuth, getZones);
