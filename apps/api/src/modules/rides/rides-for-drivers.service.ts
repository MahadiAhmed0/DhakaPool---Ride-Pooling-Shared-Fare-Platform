// What the driver side needs from rides: the waiting requests in a zone (FR-DRV-04) and the one
// request a driver is accepting.
import { REQUEST_FEED_LIMIT } from '../../config/rules.ts';
import type { Tx } from '../../db/transaction.ts';
import { findWaitingRide, findWaitingRides, type WaitingRide } from './rides.repository.ts';

export type { WaitingRide } from './rides.repository.ts';

export async function listWaitingRides(
  pickupZoneCode: string,
  maxSeats: number,
): Promise<WaitingRide[]> {
  return findWaitingRides({ pickupZoneCode, maxSeats, now: new Date(), limit: REQUEST_FEED_LIMIT });
}

export async function findRideToAccept(tx: Tx, rideId: string): Promise<WaitingRide | null> {
  return findWaitingRide(tx, rideId);
}
