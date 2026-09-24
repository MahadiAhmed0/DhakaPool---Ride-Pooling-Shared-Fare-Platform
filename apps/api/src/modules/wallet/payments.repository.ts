// Database queries for payments: how each charge (a ride fare or a fee) was settled.
import { paisaToDb } from '../../db/money.ts';
import type { Tx } from '../../db/transaction.ts';
import type { ChargeType, PaymentMethod, PaymentStatus } from '../../generated/prisma/client.ts';

export type NewPayment = {
  fareId: string;
  rideRequestId: string;
  method: PaymentMethod; // may differ from the ride's choice: TeslaPay falls back to cash (A-14)
  status: PaymentStatus;
  amountPaisa: number;
  walletTransactionId?: string;
  paidAt?: Date;
};

export type PaymentRow = { id: string; status: PaymentStatus; method: PaymentMethod };

export async function insertPayment(tx: Tx, payment: NewPayment): Promise<string> {
  const created = await tx.payment.create({
    data: { ...payment, amountPaisa: paisaToDb(payment.amountPaisa) },
    select: { id: true },
  });
  return created.id;
}

export async function findPaymentFor(
  tx: Tx,
  rideRequestId: string,
  chargeType: ChargeType,
): Promise<PaymentRow | null> {
  return tx.payment.findFirst({
    where: { rideRequestId, fare: { type: chargeType } },
    select: { id: true, status: true, method: true },
  });
}

// FR-DRV-10: compare-and-set, so cash can be marked collected only once.
export async function markCashCollected(
  tx: Tx,
  paymentId: string,
  driverId: string,
): Promise<boolean> {
  const { count } = await tx.payment.updateMany({
    where: { id: paymentId, status: 'PENDING_CASH' },
    data: { status: 'PAID', collectedById: driverId, paidAt: new Date() },
  });
  return count === 1;
}
