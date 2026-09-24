// Small helpers that insert rides and pools straight into the database, for testing the schema rules.
// Feature tests create these through the API instead.
import { prisma } from '../../src/db/client.ts';
import type { Prisma } from '../../src/generated/prisma/client.ts';

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

// Nusrat's usual trip (Banani → Mohakhali, 1 seat, TeslaPay) unless the test says otherwise.
export async function insertRide(
  passengerId: string,
  overrides: Partial<Prisma.RideRequestUncheckedCreateInput> = {},
): Promise<string> {
  const ride = await prisma.rideRequest.create({
    data: {
      passengerId,
      pickupZoneCode: 'BAN',
      destinationZoneCode: 'MHK',
      seats: 1,
      paymentMethod: 'TESLAPAY',
      estimatedFarePaisa: 7500n,
      expiresAt: new Date(Date.now() + FIFTEEN_MINUTES_MS),
      ...overrides,
    },
  });
  return ride.id;
}

// An open pool from Banani for the given driver and Tesla (capacity 3, empty) unless overridden.
export async function insertPool(
  driverId: string,
  vehicleId: string,
  overrides: Partial<Prisma.PoolUncheckedCreateInput> = {},
): Promise<string> {
  const pool = await prisma.pool.create({
    data: { driverId, vehicleId, pickupZoneCode: 'BAN', capacity: 3, ...overrides },
  });
  return pool.id;
}
