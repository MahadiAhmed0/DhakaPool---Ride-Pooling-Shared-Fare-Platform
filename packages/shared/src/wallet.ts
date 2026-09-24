// TeslaPay, the simulated wallet (FR-PAY-01, FR-PAY-02, BR-17). No real money is involved.
// Every balance change has exactly one ledger entry, so the balance always equals their sum (FR-PAY-06).
import { z } from 'zod';
import type { WalletTransactionType } from './enums.ts';

// BR-17: ৳50 to ৳5,000 per top-up.
export const TOP_UP_MIN_PAISA = 5_000;
export const TOP_UP_MAX_PAISA = 500_000;

export const topUpSchema = z.strictObject({
  amountPaisa: z
    .number()
    .int('The amount must be a whole number of paisa.')
    .min(TOP_UP_MIN_PAISA, 'The smallest top-up is ৳50.00.')
    .max(TOP_UP_MAX_PAISA, 'The largest top-up is ৳5,000.00.'),
});
export type TopUpInput = z.infer<typeof topUpSchema>;

export type WalletView = { balancePaisa: number };

// One ledger entry. amountPaisa is signed: + money in (top-up), − money out (ride, fee).
export type WalletTransactionView = {
  id: string;
  type: WalletTransactionType;
  amountPaisa: number;
  balanceAfterPaisa: number;
  rideId: string | null;
  reason: string | null;
  createdAt: string;
};

export type WalletStatement = { transactions: WalletTransactionView[]; nextCursor: string | null };
