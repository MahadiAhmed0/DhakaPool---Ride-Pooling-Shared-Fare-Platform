// Routes of the health module. Public: used by Docker and the hosting platform (NFR-REL-02).
import { Router } from 'express';
import { getHealth } from './health.controller.ts';

export const healthRouter = Router();

healthRouter.get('/', getHealth);
