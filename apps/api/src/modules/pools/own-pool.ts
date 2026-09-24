// Every driver trip command starts here: lock the driver, then the pool (the fixed lock order,
// ARCHITECTURE §7.1), and make sure the pool belongs to this driver (NFR-SEC-03, TC-04).
import { lockDriver, lockPool } from '../../db/lock.ts';
import type { Tx } from '../../db/transaction.ts';
import { NotFoundError } from '../../domain/errors.ts';
import { findPool, type PoolRow } from './pools.repository.ts';

export type PoolMember = PoolRow['members'][number];

// Someone else's pool answers exactly like a missing one, so it reveals nothing (SRS §8.2).
// The owner of a pool never changes, so it is checked before locking: another driver can never
// hold a lock on this driver's trip. The pool is read again once locked.
export async function lockOwnPool(tx: Tx, driverId: string, poolId: string): Promise<PoolRow> {
  const pool = await findPool(tx, poolId);
  if (!pool || pool.driverId !== driverId) {
    throw new NotFoundError('Trip not found.');
  }
  await lockDriver(tx, driverId);
  await lockPool(tx, poolId);
  return (await findPool(tx, poolId)) ?? pool;
}

export function findMember(pool: PoolRow, rideId: string): PoolMember {
  const member = pool.members.find((candidate) => candidate.rideRequestId === rideId);
  if (!member) {
    throw new NotFoundError('This passenger is not in this trip.');
  }
  return member;
}

export function rideIdsWithStatus(
  pool: PoolRow,
  status: PoolMember['rideRequest']['status'],
): string[] {
  return pool.members
    .filter((member) => member.rideRequest.status === status)
    .map((member) => member.rideRequestId);
}
