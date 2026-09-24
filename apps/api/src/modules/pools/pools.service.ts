// Pools shared by the driver and passenger commands: finding a driver's active pool, and turning
// pools and rides into the input of the pure matching rule (domain/matching.ts).
import { ACTIVE_POOL_STATUSES, type DriverPoolView } from '@dhakapool/shared';
import { POOL_JOIN_WINDOW_MINUTES } from '../../config/rules.ts';
import { prisma } from '../../db/client.ts';
import { lockPool } from '../../db/lock.ts';
import type { Tx } from '../../db/transaction.ts';
import { NotFoundError } from '../../domain/errors.ts';
import type { MatchPool, MatchRequest, MatchRules } from '../../domain/matching.ts';
import type { RestrictionMember } from '../../domain/pool-restriction.ts';
import type { WaitingRide } from '../rides/rides-for-drivers.service.ts';
import { loadNeighbourCheck } from '../zones/zones.service.ts';
import { toDriverPoolView } from './pool-view.ts';
import { findActivePool, findPool, type PoolRow } from './pools.repository.ts';

export type { PoolRow } from './pools.repository.ts';

export async function findActivePoolOf(tx: Tx, driverId: string): Promise<PoolRow | null> {
  return findActivePool(tx, driverId);
}

// Locks the driver's active pool and reads it again, so what we see cannot change until we commit.
// Call after lockDriver: the lock order is driver → pool → ride → wallet (ARCHITECTURE §7.1).
// While we waited for the lock, the last passenger may have left and ended the pool (FR-POOL-07);
// then the driver simply has no active pool.
export async function lockActivePool(tx: Tx, driverId: string): Promise<PoolRow | null> {
  const pool = await findActivePool(tx, driverId);
  if (!pool) {
    return null;
  }
  await lockPool(tx, pool.id);
  const lockedPool = await findPool(tx, pool.id);
  return lockedPool && ACTIVE_POOL_STATUSES.includes(lockedPool.status) ? lockedPool : null;
}

export async function getPoolView(poolId: string): Promise<DriverPoolView> {
  const pool = await findPool(prisma, poolId);
  if (!pool) {
    throw new NotFoundError('Trip not found.');
  }
  return toDriverPoolView(pool);
}

// The facts the same-gender rule needs about each active member (BR-18).
export function restrictionMembersOf(pool: PoolRow): RestrictionMember[] {
  return pool.members.map(({ rideRequest }) => ({
    sameGenderOnly: rideRequest.sameGenderOnly,
    gender: rideRequest.passenger.gender,
  }));
}

export async function currentMatchRules(): Promise<MatchRules> {
  return { joinWindowMinutes: POOL_JOIN_WINDOW_MINUTES, areNeighbours: await loadNeighbourCheck() };
}

export function toMatchPool(pool: PoolRow): MatchPool {
  return {
    status: pool.status,
    pickupZoneCode: pool.pickupZoneCode,
    capacity: pool.capacity,
    occupiedSeats: pool.occupiedSeats,
    isPrivate: pool.isPrivate,
    genderRestriction: pool.genderRestriction,
    createdAt: pool.createdAt,
    members: pool.members.map(({ rideRequest }) => ({
      destinationZoneCode: rideRequest.destinationZoneCode,
      poolOptIn: rideRequest.poolOptIn,
      gender: rideRequest.passenger.gender,
    })),
  };
}

export function toMatchRequest(ride: WaitingRide): MatchRequest {
  return {
    pickupZoneCode: ride.pickupZoneCode,
    destinationZoneCode: ride.destinationZoneCode,
    seats: ride.seats,
    poolOptIn: ride.poolOptIn,
    sameGenderOnly: ride.sameGenderOnly,
    gender: ride.passenger.gender,
    requestedAt: ride.requestedAt,
  };
}
