// Runs a piece of work inside one database transaction (NFR-CON-02, ARCHITECTURE §5.2).
// Either every change inside `work` is saved together, or none of them is.
import { prisma } from './client.ts';
import type { Prisma } from '../generated/prisma/client.ts';

// The database handle passed to repositories inside a transaction.
export type Tx = Prisma.TransactionClient;

// A transaction never waits on a user, so it should finish well within this time (ARCHITECTURE §7.2).
const TRANSACTION_TIMEOUT_MS = 5_000;

export async function withTransaction<T>(work: (tx: Tx) => Promise<T>): Promise<T> {
  return prisma.$transaction(
    async (tx) => {
      // If a row lock is held for more than 3 s, fail fast with a clear error instead of hanging.
      await tx.$executeRaw`SET LOCAL lock_timeout = '3s'`;
      return work(tx);
    },
    { timeout: TRANSACTION_TIMEOUT_MS },
  );
}
