// HTTP handler for fare estimates.
import type { FareEstimateInput } from '@dhakapool/shared';
import type { Request, Response } from 'express';
import { estimateFare } from './fares.service.ts';

// POST /api/fares/estimate — solo and pooled fares with their breakdowns (FR-PAX-02, FR-FARE-04).
export async function postFareEstimate(req: Request, res: Response): Promise<void> {
  res.status(200).json({ estimate: await estimateFare(req.body as FareEstimateInput) });
}
