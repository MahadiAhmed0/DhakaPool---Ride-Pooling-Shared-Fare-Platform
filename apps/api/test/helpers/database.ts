// Clears everything a test may have written, keeping the zone reference data.
// TRUNCATE does not fire the append-only triggers, so the audit trail can be emptied between tests.
import { prisma } from '../../src/db/client.ts';

export async function resetDatabase(): Promise<void> {
  await prisma.$executeRaw`
    TRUNCATE users, sessions, driver_profiles, vehicles, ride_requests, pools, pool_members,
             fares, payments, wallets, wallet_transactions, status_history
    RESTART IDENTITY CASCADE`;
}
