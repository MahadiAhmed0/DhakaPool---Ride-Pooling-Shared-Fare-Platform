// Expires unmatched requests once a minute (RT-04, A-13; ARCHITECTURE §7.3). Started by server.ts
// only, so tests control expiry themselves. Accepts check the expiry time too, so a late sweep is safe.
import { EXPIRY_SWEEP_INTERVAL_SECONDS } from '../config/rules.ts';
import { withTransaction } from '../db/transaction.ts';
import { logger } from '../logger.ts';
import { expireOverdueRides } from '../modules/rides/ride-expiry.service.ts';

const MS_PER_SECOND = 1_000;

export async function sweepOverdueRequests(): Promise<number> {
  return withTransaction((tx) => expireOverdueRides(tx));
}

async function sweepAndLog(): Promise<void> {
  try {
    const expiredCount = await sweepOverdueRequests();
    if (expiredCount > 0) {
      logger.info({ event: 'ride.expiry_sweep', expiredCount }, 'Expired overdue ride requests');
    }
  } catch (error) {
    // For example the database is briefly down; the next sweep tries again (NFR-REL-03).
    logger.error({ err: error }, 'Ride request expiry sweep failed');
  }
}

// Returns a function that stops the sweeps, used on shutdown.
export function startExpiryJob(): () => void {
  const timer = setInterval(
    () => void sweepAndLog(),
    EXPIRY_SWEEP_INTERVAL_SECONDS * MS_PER_SECOND,
  );
  timer.unref(); // never keeps the process alive on its own
  return () => clearInterval(timer);
}
