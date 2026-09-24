// The driver moves the whole trip forward: arriving at the pickup (FR-DRV-07; PT-02, RT-05) and
// starting the trip, which fixes every on-board passenger's fare (FR-DRV-08; PT-03, RT-08, BR-12).
import type { DriverPoolView } from '@dhakapool/shared';
import { withTransaction } from '../../db/transaction.ts';
import { ConflictError } from '../../domain/errors.ts';
import { assertPoolMove } from '../../domain/state-machine.ts';
import type { Actor } from '../audit/audit.service.ts';
import { lockRideFares } from '../fares/fare-lock.service.ts';
import { moveTripRides } from '../rides/trip-rides.service.ts';
import { lockOwnPool, rideIdsWithStatus } from './own-pool.ts';
import { movePool } from './pool-moves.ts';
import { getPoolView } from './pools.service.ts';

// BR-12: sharing means two or more different passengers on board at the start. Each member is a
// different passenger, because a passenger has only one active ride (BR-05).
const PASSENGERS_NEEDED_TO_SHARE = 2;

function nobodyTo(action: string): ConflictError {
  return new ConflictError('INVALID_STATE_TRANSITION', `There is no passenger to ${action}.`);
}

export async function markArrived(driverId: string, poolId: string): Promise<DriverPoolView> {
  const driver: Actor = { role: 'DRIVER', userId: driverId };
  await withTransaction(async (tx) => {
    const pool = await lockOwnPool(tx, driverId, poolId);
    assertPoolMove(pool.status, 'DRIVER_ARRIVED', 'DRIVER');
    const waitingRideIds = rideIdsWithStatus(pool, 'MATCHED');
    if (waitingRideIds.length === 0) {
      throw nobodyTo('pick up'); // PT-02 needs at least one MATCHED member
    }
    await movePool(tx, pool, { to: 'DRIVER_ARRIVED', actor: driver });
    await moveTripRides(tx, {
      rideIds: waitingRideIds,
      from: 'MATCHED',
      to: 'DRIVER_ARRIVED',
      actor: driver,
      poolId,
    });
  });
  return getPoolView(poolId);
}

export async function startTrip(driverId: string, poolId: string): Promise<DriverPoolView> {
  const driver: Actor = { role: 'DRIVER', userId: driverId };
  await withTransaction(async (tx) => {
    const pool = await lockOwnPool(tx, driverId, poolId);
    assertPoolMove(pool.status, 'STARTED', 'DRIVER');
    const onBoard = pool.members.filter((member) => member.rideRequest.status === 'DRIVER_ARRIVED');
    if (onBoard.length === 0) {
      throw nobodyTo('start the trip with'); // PT-03 needs at least one DRIVER_ARRIVED member
    }
    const pooled = onBoard.length >= PASSENGERS_NEEDED_TO_SHARE;
    await movePool(tx, pool, { to: 'STARTED', actor: driver, metadata: { pooled } });
    await lockRideFares(
      tx,
      onBoard.map((member) => member.rideRequest),
      pooled,
    );
    await moveTripRides(tx, {
      rideIds: onBoard.map((member) => member.rideRequestId),
      from: 'DRIVER_ARRIVED',
      to: 'STARTED',
      actor: driver,
      poolId,
    });
  });
  return getPoolView(poolId);
}
