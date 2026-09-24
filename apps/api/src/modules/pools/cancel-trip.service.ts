// The driver ends things before the trip starts:
// - cancelling the whole trip (FR-DRV-11; PT-04, RT-07, RT-10): every passenger goes back to the
//   queue for another driver, free of charge;
// - marking a passenger who never came as a no-show (FR-DRV-12; RT-09): allowed only after the
//   wait time, and the cancellation fee applies (BR-07).
import type { DriverPoolView } from '@dhakapool/shared';
import { NO_SHOW_WAIT_MINUTES } from '../../config/rules.ts';
import { withTransaction } from '../../db/transaction.ts';
import { ConflictError } from '../../domain/errors.ts';
import { assertPoolMove, assertRideMove } from '../../domain/state-machine.ts';
import type { Actor } from '../audit/audit.service.ts';
import { moveTripRides } from '../rides/trip-rides.service.ts';
import { chargeCancellationFee } from '../wallet/settlement.service.ts';
import { leavePoolBeforeStart } from './leave-pool.service.ts';
import { findMember, lockOwnPool, rideIdsWithStatus } from './own-pool.ts';
import { movePool } from './pool-moves.ts';
import { markAllMembersLeft, type PoolRow } from './pools.repository.ts';
import { getPoolView } from './pools.service.ts';

const DRIVER_CANCELLED_POOL = 'DRIVER_CANCELLED_POOL';
const NO_SHOW = 'NO_SHOW';
const MS_PER_MINUTE = 60_000;

export async function cancelTrip(driverId: string, poolId: string): Promise<DriverPoolView> {
  const driver: Actor = { role: 'DRIVER', userId: driverId };
  await withTransaction(async (tx) => {
    const pool = await lockOwnPool(tx, driverId, poolId);
    assertPoolMove(pool.status, 'CANCELLED', 'DRIVER'); // not once the trip has started
    for (const status of ['MATCHED', 'DRIVER_ARRIVED'] as const) {
      await moveTripRides(tx, {
        rideIds: rideIdsWithStatus(pool, status),
        from: status,
        to: 'REQUESTED',
        actor: driver,
        poolId,
        reason: DRIVER_CANCELLED_POOL,
      });
    }
    await markAllMembersLeft(tx, poolId, new Date());
    await movePool(tx, pool, { to: 'CANCELLED', actor: driver, reason: DRIVER_CANCELLED_POOL });
  });
  return getPoolView(poolId);
}

// FR-DRV-12: the driver must have waited NO_SHOW_WAIT_MINUTES since arriving.
function assertWaitedLongEnough(pool: PoolRow, now: Date): void {
  const arrivedAt = pool.arrivedAt?.getTime() ?? now.getTime();
  const minutesLeft = Math.ceil(
    (arrivedAt + NO_SHOW_WAIT_MINUTES * MS_PER_MINUTE - now.getTime()) / MS_PER_MINUTE,
  );
  if (minutesLeft > 0) {
    const minutes = minutesLeft === 1 ? 'minute' : 'minutes';
    throw new ConflictError(
      'INVALID_STATE_TRANSITION',
      `Please wait ${minutesLeft} more ${minutes} before marking a no-show.`,
      { minutesLeft },
    );
  }
}

export async function markNoShow(
  driverId: string,
  poolId: string,
  rideId: string,
): Promise<DriverPoolView> {
  const driver: Actor = { role: 'DRIVER', userId: driverId };
  await withTransaction(async (tx) => {
    const pool = await lockOwnPool(tx, driverId, poolId);
    const member = findMember(pool, rideId);
    assertRideMove(member.rideRequest.status, 'CANCELLED', 'DRIVER'); // only after arriving
    assertWaitedLongEnough(pool, new Date());
    await moveTripRides(tx, {
      rideIds: [rideId],
      from: 'DRIVER_ARRIVED',
      to: 'CANCELLED',
      actor: driver,
      poolId,
      reason: NO_SHOW,
    });
    await chargeCancellationFee(tx, member.rideRequest, driver); // BR-07, FR-PAY-05
    await leavePoolBeforeStart(tx, member);
  });
  return getPoolView(poolId);
}
