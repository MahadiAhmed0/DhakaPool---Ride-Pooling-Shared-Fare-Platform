// Moves a pool to a new status (PT-02 … PT-06): checks the SRS §5.2 table, changes the status by
// compare-and-set with its timestamp, and writes the audit row. Call with the pool locked.
import type { PoolStatus } from '@dhakapool/shared';
import type { Tx } from '../../db/transaction.ts';
import { ConflictError } from '../../domain/errors.ts';
import { assertPoolMove } from '../../domain/state-machine.ts';
import type { Prisma } from '../../generated/prisma/client.ts';
import { type Actor, recordTransition } from '../audit/audit.service.ts';
import { markPoolMoved, type PoolRow } from './pools.repository.ts';

export type PoolMove = {
  to: PoolStatus;
  actor: Actor;
  reason?: string;
  metadata?: Prisma.InputJsonObject;
};

// Each status has the moment it was reached (ERD §3).
function timestampFor(move: PoolMove, now: Date): Prisma.PoolUpdateManyMutationInput {
  const byStatus: Partial<Record<PoolStatus, Prisma.PoolUpdateManyMutationInput>> = {
    DRIVER_ARRIVED: { arrivedAt: now },
    STARTED: { startedAt: now },
    COMPLETED: { completedAt: now },
    CANCELLED: { cancelledAt: now, cancelReason: move.reason ?? null },
  };
  return byStatus[move.to] ?? {};
}

export async function movePool(tx: Tx, pool: PoolRow, move: PoolMove): Promise<void> {
  assertPoolMove(pool.status, move.to, move.actor.role);
  const data = { status: move.to, ...timestampFor(move, new Date()) };
  if (!(await markPoolMoved(tx, pool.id, pool.status, data))) {
    throw new ConflictError(
      'INVALID_STATE_TRANSITION',
      'This trip changed just now. Please refresh it.',
    );
  }
  await recordTransition(tx, {
    entityType: 'POOL',
    entityId: pool.id,
    fromStatus: pool.status,
    toStatus: move.to,
    actor: move.actor,
    reason: move.reason,
    metadata: move.metadata,
  });
}
