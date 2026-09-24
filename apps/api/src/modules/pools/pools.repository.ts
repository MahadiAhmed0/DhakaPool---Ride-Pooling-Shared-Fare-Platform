// Database queries for pools (Tesla trips) and their members.
import { ACTIVE_POOL_STATUSES } from '@dhakapool/shared';
import type { Tx } from '../../db/transaction.ts';
import type { Prisma } from '../../generated/prisma/client.ts';

// A pool with its Tesla and its active members. The member's gender is loaded for the matching rule
// only; it is never sent to anyone (A-20).
const POOL_INCLUDE = {
  vehicle: { select: { name: true, plate: true } },
  members: {
    where: { leftAt: null },
    orderBy: { joinedAt: 'asc' },
    include: {
      rideRequest: {
        include: { passenger: { select: { fullName: true, gender: true } }, fares: true },
      },
    },
  },
} satisfies Prisma.PoolInclude;

export type PoolRow = Prisma.PoolGetPayload<{ include: typeof POOL_INCLUDE }>;
export type NewPool = Omit<Prisma.PoolUncheckedCreateInput, 'id' | 'status' | 'occupiedSeats'>;

// BR-04: a driver has at most one active pool (also a partial unique index).
export async function findActivePool(tx: Tx, driverId: string): Promise<PoolRow | null> {
  return tx.pool.findFirst({
    where: { driverId, status: { in: [...ACTIVE_POOL_STATUSES] } },
    include: POOL_INCLUDE,
  });
}

export async function findPool(tx: Tx, poolId: string): Promise<PoolRow | null> {
  return tx.pool.findUnique({ where: { id: poolId }, include: POOL_INCLUDE });
}

export async function insertPool(tx: Tx, pool: NewPool): Promise<string> {
  const created = await tx.pool.create({ data: pool, select: { id: true } });
  return created.id;
}

// Adds the member and claims its seats in one step. The CHECK occupied_seats <= capacity is the
// last line of defence if a bug ever let too many seats through (NFR-CON-01).
export async function insertMember(
  tx: Tx,
  poolId: string,
  rideRequestId: string,
  seats: number,
): Promise<void> {
  await tx.poolMember.create({ data: { poolId, rideRequestId, seats } });
  await tx.pool.update({ where: { id: poolId }, data: { occupiedSeats: { increment: seats } } });
}

export async function updateGenderRestriction(
  tx: Tx,
  poolId: string,
  genderRestriction: Prisma.PoolUpdateInput['genderRestriction'],
): Promise<void> {
  await tx.pool.update({ where: { id: poolId }, data: { genderRestriction } });
}

export type Membership = { id: string; poolId: string; seats: number };

// FR-POOL-09: a ride is in at most one pool at a time (also a partial unique index).
export async function findActiveMembership(
  tx: Tx,
  rideRequestId: string,
): Promise<Membership | null> {
  return tx.poolMember.findFirst({
    where: { rideRequestId, leftAt: null },
    select: { id: true, poolId: true, seats: true },
  });
}

// Before the trip starts, a member who leaves keeps their row, marked with left_at (ERD §3).
export async function markMemberLeft(tx: Tx, membership: Membership, now: Date): Promise<void> {
  await tx.poolMember.update({ where: { id: membership.id }, data: { leftAt: now } });
  await tx.pool.update({
    where: { id: membership.poolId },
    data: { occupiedSeats: { decrement: membership.seats } },
  });
}

// Compare-and-set on the pool's status (NFR-CON-02). Returns false if it changed meanwhile.
export async function markPoolMoved(
  tx: Tx,
  poolId: string,
  expectedStatus: PoolRow['status'],
  data: Prisma.PoolUpdateManyMutationInput,
): Promise<boolean> {
  const { count } = await tx.pool.updateMany({
    where: { id: poolId, status: expectedStatus },
    data,
  });
  return count === 1;
}
