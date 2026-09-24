// Drivers: going online or offline (FR-DRV-02, FR-DRV-03), the driver's own status (FR-DRV-01) and
// the waiting requests a driver may accept (FR-DRV-04). Drivers never see a passenger's gender (A-20).
import { z } from 'zod';
import type { DriverAvailability, PoolStatus } from './enums.ts';
import { zoneCodeSchema } from './zones.ts';

// Going online needs the zone the driver is in; going offline needs nothing else.
export const availabilitySchema = z.discriminatedUnion('availability', [
  z.strictObject({ availability: z.literal('ONLINE'), zoneCode: zoneCodeSchema }),
  z.strictObject({ availability: z.literal('OFFLINE') }),
]);
export type AvailabilityChange = z.infer<typeof availabilitySchema>;

export type DriverStatus = {
  availability: DriverAvailability;
  zoneCode: string | null; // the zone the driver is in (or was last in)
  vehicle: { name: string; plate: string; capacity: number };
  activePool: { id: string; status: PoolStatus; occupiedSeats: number; capacity: number } | null;
};

// One request in the driver's feed (FR-DRV-04). The age is worked out from requestedAt.
export type WaitingRequest = {
  id: string;
  pickupZoneCode: string;
  destinationZoneCode: string;
  seats: number;
  poolOptIn: boolean;
  estimatedFarePaisa: number;
  requestedAt: string;
};
