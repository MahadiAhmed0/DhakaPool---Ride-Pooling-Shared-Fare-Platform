// HTTP handler for the zone list.
import type { Request, Response } from 'express';
import { listZones } from './zones.service.ts';

// GET /api/zones — every zone a passenger can choose (FR-PAX-01).
export async function getZones(_req: Request, res: Response): Promise<void> {
  res.status(200).json({ zones: await listZones() });
}
