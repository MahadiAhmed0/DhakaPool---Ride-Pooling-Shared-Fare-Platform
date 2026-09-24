// HTTP handlers for a passenger's rides. They read the input, call the service and send the result.
import { rideListQuerySchema, type RideRequestInput } from '@dhakapool/shared';
import type { Request, Response } from 'express';
import { idParam } from '../../middleware/id-param.ts';
import { cancelRideByPassenger } from './ride-cancellation.service.ts';
import { createRide, getRideForPassenger, listRidesForPassenger } from './rides.service.ts';

function rideIdFrom(req: Request): string {
  return idParam(req, 'id', 'Ride not found.');
}

// POST /api/rides — request a ride (FR-PAX-03).
export async function postRide(req: Request, res: Response): Promise<void> {
  const ride = await createRide(req.user!.id, req.body as RideRequestInput);
  res.status(201).json({ ride });
}

// GET /api/rides?scope=active|history&cursor=…&limit=… (FR-PAX-06, FR-PAX-09)
export async function getRides(req: Request, res: Response): Promise<void> {
  const query = rideListQuerySchema.parse(req.query);
  res.status(200).json(await listRidesForPassenger(req.user!.id, query));
}

// GET /api/rides/:id — one ride with its timeline (FR-PAX-10).
export async function getRide(req: Request, res: Response): Promise<void> {
  res.status(200).json({ ride: await getRideForPassenger(req.user!.id, rideIdFrom(req)) });
}

// POST /api/rides/:id/cancel — cancel the passenger's own ride (FR-PAX-08).
export async function postCancelRide(req: Request, res: Response): Promise<void> {
  res.status(200).json({ ride: await cancelRideByPassenger(req.user!.id, rideIdFrom(req)) });
}
