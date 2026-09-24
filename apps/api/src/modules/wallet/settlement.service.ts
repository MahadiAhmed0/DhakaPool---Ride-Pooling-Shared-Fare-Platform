// Settling what a passenger owes, inside the transaction of the ride change that caused it.
// - A ride fare at drop-off (BR-15, BR-16): TeslaPay is debited at once; if the balance is short, the
//   driver collects cash instead (A-14). Cash rides wait for the driver to collect (PENDING_CASH).
// - Collecting cash (FR-DRV-10): PENDING_CASH becomes PAID, with the driver who took it.
// Each payment change gets its own PAYMENT audit row (FR-HIST-04).
import type { PaymentMethod, PaymentStatus } from '@dhakapool/shared';
import type { Tx } from '../../db/transaction.ts';
import { ConflictError, InternalError } from '../../domain/errors.ts';
import { type Actor, recordTransition } from '../audit/audit.service.ts';
import { type Charge, findRideFare } from '../fares/fare-lock.service.ts';
import { findPaymentFor, insertPayment, markCashCollected } from './payments.repository.ts';
import { debitForRide } from './wallet.service.ts';

export type SettledRide = { id: string; passengerId: string; paymentMethod: PaymentMethod };

type Settlement = {
  method: PaymentMethod;
  status: PaymentStatus;
  walletTransactionId?: string;
  reason?: string;
};

const BALANCE_TOO_LOW = 'TESLAPAY_BALANCE_TOO_LOW';

async function recordPayment(
  tx: Tx,
  ride: SettledRide,
  charge: Charge,
  settlement: Settlement,
  actor: Actor,
): Promise<void> {
  const isPaid = settlement.status === 'PAID';
  const paymentId = await insertPayment(tx, {
    fareId: charge.id,
    rideRequestId: ride.id,
    method: settlement.method,
    status: settlement.status,
    amountPaisa: charge.totalPaisa,
    walletTransactionId: settlement.walletTransactionId,
    paidAt: isPaid ? new Date() : undefined,
  });
  await recordTransition(tx, {
    entityType: 'PAYMENT',
    entityId: paymentId,
    fromStatus: null,
    toStatus: settlement.status,
    actor,
    reason: settlement.reason,
    metadata: { rideId: ride.id, method: settlement.method, amountPaisa: charge.totalPaisa },
  });
}

// BR-15 with the A-14 fallback: try TeslaPay, and if the balance is short, the driver takes cash.
async function settleWithTeslaPay(tx: Tx, ride: SettledRide, charge: Charge): Promise<Settlement> {
  const walletTransactionId = await debitForRide(tx, {
    passengerId: ride.passengerId,
    rideId: ride.id,
    amountPaisa: charge.totalPaisa,
    type: 'RIDE_PAYMENT',
  });
  if (!walletTransactionId) {
    return { method: 'CASH', status: 'PENDING_CASH', reason: BALANCE_TOO_LOW };
  }
  return { method: 'TESLAPAY', status: 'PAID', walletTransactionId };
}

// Call at drop-off, after the ride has moved to COMPLETED (FR-PAY-03, FR-PAY-04).
export async function settleRideFare(tx: Tx, ride: SettledRide, actor: Actor): Promise<void> {
  const charge = await findRideFare(tx, ride.id);
  if (!charge) {
    // Every on-board passenger's fare is fixed at the start (FR-FARE-03), so this cannot happen.
    throw new InternalError();
  }
  const settlement =
    ride.paymentMethod === 'TESLAPAY'
      ? await settleWithTeslaPay(tx, ride, charge)
      : { method: 'CASH' as const, status: 'PENDING_CASH' as const };
  await recordPayment(tx, ride, charge, settlement, actor);
}

// FR-DRV-10, BR-16: the driver has the cash in hand.
export async function collectCash(tx: Tx, rideId: string, driverId: string): Promise<void> {
  const payment = await findPaymentFor(tx, rideId, 'RIDE');
  if (!payment || !(await markCashCollected(tx, payment.id, driverId))) {
    throw new ConflictError(
      'INVALID_STATE_TRANSITION',
      'There is no cash to collect for this passenger.',
    );
  }
  await recordTransition(tx, {
    entityType: 'PAYMENT',
    entityId: payment.id,
    fromStatus: 'PENDING_CASH',
    toStatus: 'PAID',
    actor: { role: 'DRIVER', userId: driverId },
    reason: 'CASH_COLLECTED',
    metadata: { rideId },
  });
}
