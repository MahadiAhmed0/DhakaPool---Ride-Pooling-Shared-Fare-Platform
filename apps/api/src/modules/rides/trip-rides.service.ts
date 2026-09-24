// Moves the rides of a Tesla trip when the driver acts on the whole trip or on one passenger
// (RT-05, RT-07, RT-08, RT-09, RT-10, RT-11). Called by the pools services, inside their locks.
import type { RideStatus } from '@dhakapool/shared';
import { REQUEST_EXPIRY_MINUTES } from '../../config/rules.ts';
import type { Tx } from '../../db/transaction.ts';
import { ConflictError } from '../../domain/errors.ts';
import { assertRideMove } from '../../domain/state-machine.ts';
import type { Prisma } from '../../generated/prisma/client.ts';
import { type Actor, recordTransitions } from '../audit/audit.service.ts';
import { markRidesMoved } from './rides.repository.ts';

const MS_PER_MINUTE = 60_000;

export type TripRideMove = {
  rideIds: string[];
  from: RideStatus;
  to: RideStatus;
  actor: Actor;
  poolId: string;
  reason?: string;
};

// The other columns that change with the status.
function sideEffectsOf(move: TripRideMove, now: Date): Prisma.RideRequestUpdateManyMutationInput {
  if (move.to === 'COMPLETED') {
    return { completedAt: now };
  }
  if (move.to === 'CANCELLED') {
    return { cancelledAt: now, cancelReason: move.reason ?? null };
  }
  if (move.to === 'REQUESTED') {
    // RT-07/RT-10: back in the queue, so the 15-minute expiry and the join window start again.
    return {
      requestedAt: now,
      expiresAt: new Date(now.getTime() + REQUEST_EXPIRY_MINUTES * MS_PER_MINUTE),
    };
  }
  return {};
}

export async function moveTripRides(tx: Tx, move: TripRideMove): Promise<void> {
  if (move.rideIds.length === 0) {
    return;
  }
  assertRideMove(move.from, move.to, move.actor.role);
  const now = new Date();
  const movedIds = await markRidesMoved(tx, move.rideIds, move.from, {
    status: move.to,
    ...sideEffectsOf(move, now),
  });
  // Every passenger command takes the pool lock too, so under that lock nothing should differ.
  if (movedIds.length !== move.rideIds.length) {
    throw new ConflictError(
      'INVALID_STATE_TRANSITION',
      "A passenger's ride changed just now. Please refresh the trip and try again.",
    );
  }
  await recordTransitions(
    tx,
    movedIds.map((rideId) => ({
      entityType: 'RIDE_REQUEST',
      entityId: rideId,
      fromStatus: move.from,
      toStatus: move.to,
      actor: move.actor,
      reason: move.reason,
      metadata: { poolId: move.poolId },
    })),
  );
}
