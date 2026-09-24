// A passenger cancels their own ride (FR-PAX-08, BR-07).
// - REQUESTED (RT-03): free; nothing else to undo.
// - MATCHED (RT-06): free; the seats in the pool are freed and an empty pool ends (FR-POOL-06, -07).
// - DRIVER_ARRIVED (RT-09): the same, plus the cancellation fee, charged to TeslaPay (FR-PAY-05).
// - STARTED or finished: refused.
import type { RideDetail, RideStatus } from '@dhakapool/shared';
import { type Tx, withTransaction } from '../../db/transaction.ts';
import { cancellationPolicy } from '../../domain/cancellation.ts';
import { ConflictError, NotFoundError } from '../../domain/errors.ts';
import { recordTransition } from '../audit/audit.service.ts';
import { leavePoolBeforeStart, lockPoolOfRide } from '../pools/leave-pool.service.ts';
import { chargeCancellationFee } from '../wallet/settlement.service.ts';
import { expireOverdueRidesOf } from './ride-expiry.service.ts';
import { findRideToCancel, markRideCancelled, type RideToCancel } from './rides.repository.ts';
import { getRideForPassenger } from './rides.service.ts';

const PASSENGER_CANCELLED = 'PASSENGER_CANCELLED';

type Cancellation = { tx: Tx; passengerId: string; rideId: string };

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

// Moves the ride to CANCELLED only if it is still in `fromStatus` (compare-and-set), then audits it.
async function cancelFrom(cancellation: Cancellation, fromStatus: RideStatus): Promise<boolean> {
  const { tx, passengerId, rideId } = cancellation;
  if (!(await markRideCancelled(tx, rideId, fromStatus, PASSENGER_CANCELLED))) {
    return false;
  }
  await recordTransition(tx, {
    entityType: 'RIDE_REQUEST',
    entityId: rideId,
    fromStatus,
    toStatus: 'CANCELLED',
    actor: { role: 'PASSENGER', userId: passengerId },
    reason: PASSENGER_CANCELLED,
  });
  return true;
}

// RT-06, RT-09: lock the pool first (lock order pool → ride → wallet), cancel the ride, charge the
// fee if the driver had already arrived, then free the seats.
async function cancelRideInPool(cancellation: Cancellation, ride: RideToCancel): Promise<boolean> {
  const { tx, passengerId, rideId } = cancellation;
  const membership = await lockPoolOfRide(tx, rideId);
  if (!membership || !(await cancelFrom(cancellation, ride.status))) {
    return false;
  }
  if (cancellationPolicy(ride.status) === 'FEE') {
    const cancelledRide = {
      id: rideId,
      passengerId,
      paymentMethod: ride.paymentMethod,
      seats: membership.seats,
    };
    await chargeCancellationFee(tx, cancelledRide, { role: 'PASSENGER', userId: passengerId });
  }
  await leavePoolBeforeStart(tx, membership);
  return true;
}

// Returns false when the ride changed between reading its status and writing the new one.
async function tryToCancel(cancellation: Cancellation): Promise<boolean> {
  const { tx, passengerId, rideId } = cancellation;
  const ride = await findRideToCancel(tx, passengerId, rideId);
  if (!ride) {
    throw new NotFoundError('Ride not found.');
  }
  if (cancellationPolicy(ride.status) === 'FORBIDDEN') {
    throw cannotCancel(ride.status, forbiddenMessage(ride.status));
  }
  if (ride.status === 'REQUESTED') {
    return cancelFrom(cancellation, 'REQUESTED');
  }
  return cancelRideInPool(cancellation, ride); // MATCHED or DRIVER_ARRIVED
}

export async function cancelRideByPassenger(
  passengerId: string,
  rideId: string,
): Promise<RideDetail> {
  // An overdue request is EXPIRED, not cancellable (NFR-REL-04).
  await expireOverdueRidesOf(passengerId);
  await withTransaction(async (tx) => {
    const cancellation = { tx, passengerId, rideId };
    // A driver may accept the ride at the same moment (TC-17). If so, the status we read is stale:
    // read it again once and cancel from the new status.
    if ((await tryToCancel(cancellation)) || (await tryToCancel(cancellation))) {
      return;
    }
    throw new ConflictError(
      'INVALID_STATE_TRANSITION',
      'Your ride changed just now. Please check it and try again.',
    );
  });
  return getRideForPassenger(passengerId, rideId);
}
