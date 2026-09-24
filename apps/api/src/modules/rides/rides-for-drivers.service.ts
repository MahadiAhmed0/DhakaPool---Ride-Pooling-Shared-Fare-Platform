// What the driver side needs from rides: the waiting requests in a zone (FR-DRV-04), the one request
// a driver is accepting, and the REQUESTED → MATCHED move itself (RT-02).
import { REQUEST_FEED_LIMIT } from '../../config/rules.ts';
import type { Tx } from '../../db/transaction.ts';
import { ConflictError, NotFoundError } from '../../domain/errors.ts';
import { recordTransition } from '../audit/audit.service.ts';
import {
  findWaitingRide,
  findWaitingRides,
  markRideMatched,
  type WaitingRide,
} from './rides.repository.ts';

export type { WaitingRide } from './rides.repository.ts';

function notWaiting(message: string): ConflictError {
  return new ConflictError('INVALID_STATE_TRANSITION', message, {
    entity: 'RIDE_REQUEST',
    to: 'MATCHED',
  });
}

export async function listWaitingRides(
  pickupZoneCode: string,
  maxSeats: number,
): Promise<WaitingRide[]> {
  return findWaitingRides({ pickupZoneCode, maxSeats, now: new Date(), limit: REQUEST_FEED_LIMIT });
}

// The request must still be waiting, and not past its expiry time (NFR-REL-04, TC-24).
export async function loadWaitingRide(tx: Tx, rideId: string): Promise<WaitingRide> {
  const ride = await findWaitingRide(tx, rideId);
  if (!ride) {
    throw new NotFoundError('Request not found.');
  }
  if (ride.status !== 'REQUESTED') {
    throw notWaiting('This request is no longer waiting for a driver.');
  }
  if (ride.expiresAt.getTime() <= Date.now()) {
    throw notWaiting('This request has expired.');
  }
  return ride;
}

// RT-02. The compare-and-set decides races: when two drivers accept the same request at once,
// exactly one of them moves it (FR-POOL-09, TC-06).
export async function matchRide(
  tx: Tx,
  rideId: string,
  driverId: string,
  poolId: string,
): Promise<void> {
  if (!(await markRideMatched(tx, rideId, new Date()))) {
    throw notWaiting('Another driver accepted this request first.');
  }
  await recordTransition(tx, {
    entityType: 'RIDE_REQUEST',
    entityId: rideId,
    fromStatus: 'REQUESTED',
    toStatus: 'MATCHED',
    actor: { role: 'DRIVER', userId: driverId },
    metadata: { poolId },
  });
}
