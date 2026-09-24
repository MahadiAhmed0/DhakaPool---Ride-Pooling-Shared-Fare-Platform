// Pools shared by the driver and passenger commands: finding a driver's active pool, and turning
// pools and rides into the input of the pure matching rule (domain/matching.ts).
import { POOL_JOIN_WINDOW_MINUTES } from '../../config/rules.ts';
import type { Tx } from '../../db/transaction.ts';
import type { MatchPool, MatchRequest, MatchRules } from '../../domain/matching.ts';
import type { WaitingRide } from '../rides/rides-for-drivers.service.ts';
import { loadNeighbourCheck } from '../zones/zones.service.ts';
import { findActivePool, type PoolRow } from './pools.repository.ts';

export type { PoolRow } from './pools.repository.ts';

export async function findActivePoolOf(tx: Tx, driverId: string): Promise<PoolRow | null> {
  return findActivePool(tx, driverId);
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
