// HTTP handlers for the driver's own status, the request feed and accepting a request.
import type { AvailabilityChange } from '@dhakapool/shared';
import type { Request, Response } from 'express';
import { idParam } from '../../middleware/id-param.ts';
import { acceptRequest } from '../pools/accept-request.service.ts';
import { getDriverStatus, setAvailability } from './drivers.service.ts';
import { listRelevantRequests } from './request-feed.service.ts';

// GET /api/driver/availability — online or offline, zone, Tesla and active pool (FR-DRV-01).
export async function getAvailability(req: Request, res: Response): Promise<void> {
  res.status(200).json({ driver: await getDriverStatus(req.user!.id) });
}

// PUT /api/driver/availability — go online in a zone, or go offline (FR-DRV-02, FR-DRV-03).
export async function putAvailability(req: Request, res: Response): Promise<void> {
  const driver = await setAvailability(req.user!.id, req.body as AvailabilityChange);
  res.status(200).json({ driver });
}

// GET /api/driver/requests — the waiting requests this driver may accept (FR-DRV-04).
export async function getRequests(req: Request, res: Response): Promise<void> {
  res.status(200).json({ requests: await listRelevantRequests(req.user!.id) });
}

// POST /api/driver/requests/:id/accept — take the request into this driver's trip (FR-DRV-05).
export async function postAcceptRequest(req: Request, res: Response): Promise<void> {
  const rideId = idParam(req, 'id', 'Request not found.');
  res.status(200).json({ pool: await acceptRequest(req.user!.id, rideId) });
}
