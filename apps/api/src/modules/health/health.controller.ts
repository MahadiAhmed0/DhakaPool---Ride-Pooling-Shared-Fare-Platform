// HTTP handler for GET /health: 200 when healthy, 503 when the database is down.
import type { Request, Response } from 'express';
import { checkHealth } from './health.service.ts';

export async function getHealth(_req: Request, res: Response): Promise<void> {
  const health = await checkHealth();
  const httpStatus = health.status === 'ok' ? 200 : 503;
  res.status(httpStatus).json(health);
}
