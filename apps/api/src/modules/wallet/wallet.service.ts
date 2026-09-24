// TeslaPay wallets (FR-PAY-01, FR-PAY-02, FR-PAY-06). Every change to a balance is made with the
// wallet row locked and writes exactly one ledger entry in the same transaction (NFR-CON-05).
// Other modules use these functions, never the repository.
import type { PageQuery, WalletStatement, WalletView } from '@dhakapool/shared';
import { prisma } from '../../db/client.ts';
import { paisaFromDb } from '../../db/money.ts';
import { lockWallet } from '../../db/lock.ts';
import { type Tx, withTransaction } from '../../db/transaction.ts';
import { NotFoundError } from '../../domain/errors.ts';
import type { WalletTransaction } from '../../generated/prisma/client.ts';
import {
  creditWallet,
  debitWallet,
  findBalancePaisa,
  findLedgerEntries,
  findWallet,
  insertLedgerEntry,
  type WalletRow,
} from './wallet.repository.ts';

export type RideDebit = {
  passengerId: string;
  rideId: string;
  amountPaisa: number;
  type: 'RIDE_PAYMENT' | 'CANCELLATION_FEE';
};

export async function getBalancePaisa(tx: Tx, passengerId: string): Promise<number> {
  return findBalancePaisa(tx, passengerId);
}

// Finds the passenger's wallet and locks it until the transaction ends. The wallet is always the
// last row locked (lock order driver → pool → ride → wallet, ARCHITECTURE §7.1).
async function lockWalletOf(tx: Tx, passengerId: string): Promise<WalletRow> {
  const wallet = await findWallet(tx, passengerId);
  if (!wallet) {
    throw new NotFoundError('No TeslaPay wallet was found for this passenger.');
  }
  await lockWallet(tx, wallet.id);
  return wallet;
}

export async function getWallet(passengerId: string): Promise<WalletView> {
  return { balancePaisa: await findBalancePaisa(prisma, passengerId) };
}

function toTransactionView(entry: WalletTransaction): WalletStatement['transactions'][number] {
  return {
    id: entry.id,
    type: entry.type,
    amountPaisa: paisaFromDb(entry.amountPaisa),
    balanceAfterPaisa: paisaFromDb(entry.balanceAfterPaisa),
    rideId: entry.rideRequestId,
    reason: entry.reason,
    createdAt: entry.createdAt.toISOString(),
  };
}

// FR-PAY-01: the statement, newest first, a page at a time.
export async function getStatement(
  passengerId: string,
  query: PageQuery,
): Promise<WalletStatement> {
  const wallet = await findWallet(prisma, passengerId);
  if (!wallet) {
    return { transactions: [], nextCursor: null };
  }
  const rows = await findLedgerEntries(prisma, { walletId: wallet.id, ...query });
  const page = rows.slice(0, query.limit);
  const hasMore = rows.length > query.limit;
  return {
    transactions: page.map(toTransactionView),
    nextCursor: hasMore ? (page.at(-1)?.id ?? null) : null,
  };
}

// FR-PAY-02, BR-17: simulated money, credited at once. The amount limits are checked by the schema.
export async function topUp(passengerId: string, amountPaisa: number): Promise<WalletView> {
  const balancePaisa = await withTransaction(async (tx) => {
    const wallet = await lockWalletOf(tx, passengerId);
    const balanceAfterPaisa = await creditWallet(tx, wallet.id, amountPaisa);
    await insertLedgerEntry(tx, {
      walletId: wallet.id,
      type: 'TOPUP',
      amountPaisa,
      balanceAfterPaisa,
    });
    return balanceAfterPaisa;
  });
  return { balancePaisa };
}

// Takes a ride fare or a fee from the wallet (FR-PAY-03, FR-PAY-05). Returns the ledger entry id,
// or null when the balance is too low — then nothing changes and the caller falls back (A-14).
export async function debitForRide(tx: Tx, debit: RideDebit): Promise<string | null> {
  const wallet = await lockWalletOf(tx, debit.passengerId);
  const balanceAfterPaisa = await debitWallet(tx, wallet.id, debit.amountPaisa);
  if (balanceAfterPaisa === null) {
    return null;
  }
  return insertLedgerEntry(tx, {
    walletId: wallet.id,
    type: debit.type,
    amountPaisa: -debit.amountPaisa,
    balanceAfterPaisa,
    rideRequestId: debit.rideId,
  });
}
