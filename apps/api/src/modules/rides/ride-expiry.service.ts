// Request expiry (RT-04, A-13, NFR-REL-04). An unmatched request expires 15 minutes after it was made.
// Two things apply it: a sweep every minute (jobs/expire-requests.ts), and each passenger command,
// which first expires that passenger's own overdue rides so a late sweep never shows a stale status.
import { type Tx, withTransaction } from '../../db/transaction.ts';
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

// Runs in its own transaction, before the passenger's command. The expiry is then kept even when
// the command itself is refused and rolled back.
export async function expireOverdueRidesOf(passengerId: string): Promise<void> {
  await withTransaction((tx) => expireOverdueRides(tx, passengerId));
}
