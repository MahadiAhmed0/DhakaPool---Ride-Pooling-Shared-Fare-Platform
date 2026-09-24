// Small helpers that insert rides and pools straight into the database. They set up states the API
// cannot reach yet in a test, or would need many steps to reach (for example a started trip).
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

// Puts a ride into a pool as an active member.
export async function insertPoolMember(
  poolId: string,
  rideRequestId: string,
  seats = 1,
): Promise<void> {
  await prisma.$transaction([
    prisma.poolMember.create({ data: { poolId, rideRequestId, seats } }),
    prisma.pool.update({ where: { id: poolId }, data: { occupiedSeats: { increment: seats } } }),
  ]);
}
