// Database queries for charges (the fares table). A charge is written once and never changed
// (FR-FARE-03); UNIQUE(ride_request_id, type) allows one ride fare and one cancellation fee.
import type { Tx } from '../../db/transaction.ts';
import type { Prisma } from '../../generated/prisma/client.ts';

export async function insertFares(tx: Tx, fares: Prisma.FareCreateManyInput[]): Promise<void> {
  await tx.fare.createMany({ data: fares });
}
