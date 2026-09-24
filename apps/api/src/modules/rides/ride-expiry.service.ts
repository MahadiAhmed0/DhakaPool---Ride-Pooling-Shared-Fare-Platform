// Request expiry (RT-04, A-13, NFR-REL-04). An unmatched request expires 15 minutes after it was made.
// Two things apply it: a sweep every minute (jobs/expire-requests.ts), and each passenger command,
// which first expires that passenger's own overdue rides so a late sweep never shows a stale status.
import type { Tx } from '../../db/transaction.ts';
import { recordTransitions, SYSTEM_ACTOR } from '../audit/audit.service.ts';
import { markOverdueRidesExpired } from './rides.repository.ts';

// Expires overdue rides (only this passenger's, when one is given) and records each change.
// Returns how many rides expired.
export async function expireOverdueRides(tx: Tx, passengerId?: string): Promise<number> {
  const expiredRideIds = await markOverdueRidesExpired(tx, new Date(), passengerId);
  await recordTransitions(
    tx,
    expiredRideIds.map((rideId) => ({
      entityType: 'RIDE_REQUEST',
      entityId: rideId,
      fromStatus: 'REQUESTED',
      toStatus: 'EXPIRED',
      actor: SYSTEM_ACTOR,
      reason: 'EXPIRED',
    })),
  );
  return expiredRideIds.length;
}
