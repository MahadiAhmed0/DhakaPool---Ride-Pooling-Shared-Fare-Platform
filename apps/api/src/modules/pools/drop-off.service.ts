// The driver drops passengers off one by one, in any order (FR-DRV-09; RT-11). When the last one
// is off, the system completes the trip and the driver is now in that passenger's zone
// (FR-POOL-08; PT-06).
import type { DriverPoolView } from '@dhakapool/shared';
import { withTransaction } from '../../db/transaction.ts';
import { assertRideMove } from '../../domain/state-machine.ts';
import { type Actor, SYSTEM_ACTOR } from '../audit/audit.service.ts';
import { moveDriverToZone } from '../drivers/drivers.service.ts';
import { moveTripRides } from '../rides/trip-rides.service.ts';
import { findMember, lockOwnPool } from './own-pool.ts';
import { movePool } from './pool-moves.ts';
import { markMemberDroppedOff } from './pools.repository.ts';
import { getPoolView } from './pools.service.ts';

const LAST_MEMBER_DROPPED_OFF = 'LAST_MEMBER_DROPPED_OFF';

export async function dropOff(
  driverId: string,
  poolId: string,
  rideId: string,
): Promise<DriverPoolView> {
  const driver: Actor = { role: 'DRIVER', userId: driverId };
  await withTransaction(async (tx) => {
    const pool = await lockOwnPool(tx, driverId, poolId);
    const member = findMember(pool, rideId);
    // Only a passenger on board can be dropped off (TC-02: not a MATCHED one).
    assertRideMove(member.rideRequest.status, 'COMPLETED', 'DRIVER');
    await moveTripRides(tx, {
      rideIds: [rideId],
      from: 'STARTED',
      to: 'COMPLETED',
      actor: driver,
      poolId,
    });
    const alreadyDroppedOff = pool.members.filter((other) => other.dropoffOrder !== null).length;
    await markMemberDroppedOff(tx, member, alreadyDroppedOff + 1, new Date());
    const stillOnBoard = pool.members.filter(
      (other) => other.rideRequestId !== rideId && other.rideRequest.status === 'STARTED',
    );
    if (stillOnBoard.length === 0) {
      const lastZoneCode = member.rideRequest.destinationZoneCode;
      await movePool(tx, pool, {
        to: 'COMPLETED',
        actor: SYSTEM_ACTOR,
        reason: LAST_MEMBER_DROPPED_OFF,
        metadata: { driverZoneCode: lastZoneCode },
      });
      await moveDriverToZone(tx, driverId, lastZoneCode);
    }
  });
  return getPoolView(poolId);
}
