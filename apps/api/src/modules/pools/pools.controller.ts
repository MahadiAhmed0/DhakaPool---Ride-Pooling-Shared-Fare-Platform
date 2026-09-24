// HTTP handlers for a driver's trip commands (SRS §8.2). Each returns the updated trip.
import type { Request, Response } from 'express';
import { idParam } from '../../middleware/id-param.ts';
import { markArrived, startTrip } from './trip.service.ts';

function poolIdFrom(req: Request): string {
  return idParam(req, 'id', 'Trip not found.');
}

// POST /api/pools/:id/arrive (FR-DRV-07)
export async function postArrive(req: Request, res: Response): Promise<void> {
  res.status(200).json({ pool: await markArrived(req.user!.id, poolIdFrom(req)) });
}

// POST /api/pools/:id/start (FR-DRV-08) — fixes the fares (BR-12)
export async function postStart(req: Request, res: Response): Promise<void> {
  res.status(200).json({ pool: await startTrip(req.user!.id, poolIdFrom(req)) });
}
