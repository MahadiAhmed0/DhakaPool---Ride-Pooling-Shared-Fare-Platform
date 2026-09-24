// A passenger cancels their own ride (FR-PAX-08, BR-07; RT-03).
// A ride nobody has accepted yet is cancelled here, free of charge. A ride in a pool also frees its
// seats (FR-POOL-06), so that case belongs to the pooling module and is refused here for now.
import type { RideDetail, RideStatus } from '@dhakapool/shared';
import { type Tx, withTransaction } from '../../db/transaction.ts';
import { cancellationPolicy } from '../../domain/cancellation.ts';
import { ConflictError, NotFoundError } from '../../domain/errors.ts';
import { recordTransition } from '../audit/audit.service.ts';
import { expireOverdueRidesOf } from './ride-expiry.service.ts';
import { findPassengerRideStatus, markRideCancelled } from './rides.repository.ts';
import { getRideForPassenger } from './rides.service.ts';

const PASSENGER_CANCELLED = 'PASSENGER_CANCELLED';

function cannotCancel(status: RideStatus, message: string): ConflictError {
  return new ConflictError('INVALID_STATE_TRANSITION', message, {
    entity: 'RIDE_REQUEST',
    from: status,
    to: 'CANCELLED',
  });
}

// BR-07: a started ride is ended by the drop-off, and a finished ride cannot change.
function forbiddenMessage(status: RideStatus): string {
  if (status === 'STARTED') {
    return 'Your trip has already started, so it cannot be cancelled. The driver will drop you off.';
  }
  return `This ride is already ${status.toLowerCase()}, so there is nothing to cancel.`;
}

async function cancelUnmatchedRide(tx: Tx, passengerId: string, rideId: string): Promise<void> {
  const isCancelled = await markRideCancelled(tx, rideId, 'REQUESTED', PASSENGER_CANCELLED);
  if (!isCancelled) {
    // A driver accepted it (or it expired) between our read and our write.
    throw cannotCancel('REQUESTED', 'Your ride changed just now. Please check it and try again.');
  }
  await recordTransition(tx, {
    entityType: 'RIDE_REQUEST',
    entityId: rideId,
    fromStatus: 'REQUESTED',
    toStatus: 'CANCELLED',
    actor: { role: 'PASSENGER', userId: passengerId },
    reason: PASSENGER_CANCELLED,
  });
}

export async function cancelRideByPassenger(
  passengerId: string,
  rideId: string,
): Promise<RideDetail> {
  // An overdue request is EXPIRED, not cancellable (NFR-REL-04).
  await expireOverdueRidesOf(passengerId);
  await withTransaction(async (tx) => {
    const status = await findPassengerRideStatus(tx, passengerId, rideId);
    if (!status) {
      throw new NotFoundError('Ride not found.');
    }
    if (cancellationPolicy(status) === 'FORBIDDEN') {
      throw cannotCancel(status, forbiddenMessage(status));
    }
    if (status !== 'REQUESTED') {
      throw cannotCancel(
        status,
        'Cancelling a ride that a driver has accepted is not available yet.',
      );
    }
    await cancelUnmatchedRide(tx, passengerId, rideId);
  });
  return getRideForPassenger(passengerId, rideId);
}
