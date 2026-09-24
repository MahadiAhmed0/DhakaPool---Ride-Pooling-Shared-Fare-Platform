// The audit trail (FR-HIST-01…04): one row for every status change of a ride, pool, driver or
// payment, written in the same transaction as the change, so the two are saved together or not at all.
// Each change is also logged at INFO (NFR-OBS-02). Call it as the last step of the transaction.
import type { ActorRole } from '@dhakapool/shared';
import type { Tx } from '../../db/transaction.ts';
import type { AuditEntity, Prisma } from '../../generated/prisma/client.ts';
import { logger } from '../../logger.ts';
import { findHistory, insertHistoryRows } from './audit.repository.ts';

// Who made the change: a signed-in user, or the system itself (for example request expiry).
export type Actor = { role: ActorRole; userId: string | null };
export const SYSTEM_ACTOR: Actor = { role: 'SYSTEM', userId: null };

export type Transition = {
  entityType: AuditEntity;
  entityId: string;
  fromStatus: string | null; // null when the entity is created
  toStatus: string;
  actor: Actor;
  reason?: string; // a code such as PASSENGER_CANCELLED or EXPIRED (ERD §3)
  metadata?: Prisma.InputJsonObject;
};

export type TimelineEntry = {
  fromStatus: string | null;
  toStatus: string;
  actorRole: ActorRole;
  reason: string | null;
  at: Date;
};

// Log event names, e.g. "ride.transition" (ARCHITECTURE §9.2).
const LOG_EVENT: Record<AuditEntity, string> = {
  RIDE_REQUEST: 'ride.transition',
  POOL: 'pool.transition',
  DRIVER: 'driver.transition',
  PAYMENT: 'payment.transition',
};

export async function recordTransitions(tx: Tx, transitions: Transition[]): Promise<void> {
  if (transitions.length === 0) {
    return;
  }
  await insertHistoryRows(
    tx,
    transitions.map((change) => ({
      entityType: change.entityType,
      entityId: change.entityId,
      fromStatus: change.fromStatus,
      toStatus: change.toStatus,
      actorUserId: change.actor.userId,
      actorRole: change.actor.role,
      reason: change.reason ?? null,
      metadata: change.metadata,
    })),
  );
  for (const change of transitions) {
    const { entityType, entityId, fromStatus, toStatus, actor, reason } = change;
    logger.info(
      { event: LOG_EVENT[entityType], entityId, fromStatus, toStatus, actor, reason },
      `${entityType} ${fromStatus ?? '(new)'} → ${toStatus}`,
    );
  }
}

export async function recordTransition(tx: Tx, transition: Transition): Promise<void> {
  await recordTransitions(tx, [transition]);
}

// The full history of one ride, pool or driver, oldest first (FR-PAX-10).
export async function listTimeline(
  entityType: AuditEntity,
  entityId: string,
): Promise<TimelineEntry[]> {
  const rows = await findHistory(entityType, entityId);
  return rows.map((row) => ({
    fromStatus: row.fromStatus,
    toStatus: row.toStatus,
    actorRole: row.actorRole,
    reason: row.reason,
    at: row.createdAt,
  }));
}
