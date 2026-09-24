// FR-DRV-04: the waiting requests a driver may accept right now.
// - No active pool: requests waiting in the driver's zone that fit the Tesla.
// - An OPEN pool: only requests that could join it (BR-02), so every one shown can be accepted.
// - A pool that has already arrived or started: none, because nobody can join any more.
import type { WaitingRequest } from '@dhakapool/shared';
import { prisma } from '../../db/client.ts';
import { paisaFromDb } from '../../db/money.ts';
import { isCompatible } from '../../domain/matching.ts';
import {
  currentMatchRules,
  findActivePoolOf,
  toMatchPool,
  toMatchRequest,
} from '../pools/pools.service.ts';
import { listWaitingRides, type WaitingRide } from '../rides/rides-for-drivers.service.ts';
import { assertOnline, loadDriver } from './drivers.service.ts';

// The driver sees the trip, not the passenger: no name and no gender until they accept (A-20).
function toWaitingRequest(ride: WaitingRide): WaitingRequest {
  return {
    id: ride.id,
    pickupZoneCode: ride.pickupZoneCode,
    destinationZoneCode: ride.destinationZoneCode,
    seats: ride.seats,
    poolOptIn: ride.poolOptIn,
    estimatedFarePaisa: paisaFromDb(ride.estimatedFarePaisa),
    requestedAt: ride.requestedAt.toISOString(),
  };
}

export async function listRelevantRequests(driverId: string): Promise<WaitingRequest[]> {
  const driver = await loadDriver(prisma, driverId);
  assertOnline(driver);
  const pool = await findActivePoolOf(prisma, driverId);
  if (!pool) {
    const rides = await listWaitingRides(driver.currentZoneCode, driver.vehicle.capacity);
    return rides.map(toWaitingRequest);
  }
  if (pool.status !== 'OPEN') {
    return [];
  }
  const freeSeats = pool.capacity - pool.occupiedSeats;
  const rides = await listWaitingRides(pool.pickupZoneCode, freeSeats);
  const rules = await currentMatchRules();
  const matchPool = toMatchPool(pool);
  return rides
    .filter((ride) => isCompatible(toMatchRequest(ride), matchPool, rules).ok)
    .map(toWaitingRequest);
}
