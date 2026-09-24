// A member leaves a pool before the trip starts (FR-POOL-06, FR-POOL-07, FR-POOL-12):
// the seats are freed at once, the same-gender restriction is worked out again, and a pool left
// with nobody in it is cancelled so the driver is free again.
// Passenger commands lock only the pool, never the driver row (ARCHITECTURE §7.1).
import { lockPool } from '../../db/lock.ts';
import type { Tx } from '../../db/transaction.ts';
import { genderRestriction } from '../../domain/pool-restriction.ts';
import { assertPoolMove } from '../../domain/state-machine.ts';
import { recordTransition, SYSTEM_ACTOR } from '../audit/audit.service.ts';
import {
  findActiveMembership,
  findPool,
  markMemberLeft,
  markPoolCancelled,
  type Membership,
  type PoolRow,
  updateGenderRestriction,
} from './pools.repository.ts';
import { restrictionMembersOf } from './pools.service.ts';

const ALL_MEMBERS_CANCELLED = 'ALL_MEMBERS_CANCELLED';

export type { Membership } from './pools.repository.ts';

// Locks the pool the ride is in and reads the membership again under the lock.
// Returns null when the ride is no longer in a pool (for example the driver cancelled the trip).
export async function lockPoolOfRide(tx: Tx, rideId: string): Promise<Membership | null> {
  const membership = await findActiveMembership(tx, rideId);
  if (!membership) {
    return null;
  }
  await lockPool(tx, membership.poolId);
  return findActiveMembership(tx, rideId);
}

// PT-05 (FR-POOL-07): the system ends a pool that nobody is left in.
async function cancelEmptyPool(tx: Tx, pool: PoolRow): Promise<void> {
  assertPoolMove(pool.status, 'CANCELLED', 'SYSTEM');
  await markPoolCancelled(tx, pool.id, pool.status, ALL_MEMBERS_CANCELLED);
  await recordTransition(tx, {
    entityType: 'POOL',
    entityId: pool.id,
    fromStatus: pool.status,
    toStatus: 'CANCELLED',
    actor: SYSTEM_ACTOR,
    reason: ALL_MEMBERS_CANCELLED,
  });
}

// Call with the pool locked (lockPoolOfRide), after the ride itself has changed status.
export async function leavePoolBeforeStart(tx: Tx, membership: Membership): Promise<void> {
  await markMemberLeft(tx, membership, new Date());
  const pool = await findPool(tx, membership.poolId);
  if (!pool) {
    return;
  }
  if (pool.members.length === 0) {
    await cancelEmptyPool(tx, pool);
    return;
  }
  const restriction = genderRestriction(restrictionMembersOf(pool));
  if (restriction !== pool.genderRestriction) {
    await updateGenderRestriction(tx, pool.id, restriction);
  }
}
