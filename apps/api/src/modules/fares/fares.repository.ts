// Database queries for charges (the fares table). A charge is written once and never changed
// (FR-FARE-03); UNIQUE(ride_request_id, type) allows one ride fare and one cancellation fee.
import { paisaFromDb } from '../../db/money.ts';
import type { Tx } from '../../db/transaction.ts';
import type { ChargeType, Prisma } from '../../generated/prisma/client.ts';

export type Charge = { id: string; totalPaisa: number };

export async function insertFares(tx: Tx, fares: Prisma.FareCreateManyInput[]): Promise<void> {
  await tx.fare.createMany({ data: fares });
}

export async function insertFare(tx: Tx, fare: Prisma.FareUncheckedCreateInput): Promise<Charge> {
  const created = await tx.fare.create({ data: fare });
  return { id: created.id, totalPaisa: paisaFromDb(created.totalPaisa) };
}

export async function findCharge(
  tx: Tx,
  rideRequestId: string,
  type: ChargeType,
): Promise<Charge | null> {
  const fare = await tx.fare.findUnique({ where: { rideRequestId_type: { rideRequestId, type } } });
  return fare ? { id: fare.id, totalPaisa: paisaFromDb(fare.totalPaisa) } : null;
}
