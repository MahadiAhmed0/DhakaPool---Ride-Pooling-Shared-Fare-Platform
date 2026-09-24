// Database queries for TeslaPay wallets and their ledger (wallet_transactions).
// The ledger is append-only (a database trigger forbids updates and deletes), and the balance can
// never go below zero (CHECK balance_paisa >= 0).
import { paisaFromDb, paisaToDb } from '../../db/money.ts';
import type { Tx } from '../../db/transaction.ts';
import type { WalletTransaction, WalletTxnType } from '../../generated/prisma/client.ts';

export type WalletRow = { id: string; balancePaisa: number };

export type LedgerEntry = {
  walletId: string;
  type: WalletTxnType;
  amountPaisa: number; // signed: + credit, − debit
  balanceAfterPaisa: number;
  rideRequestId?: string;
  reason?: string;
};

export type LedgerPage = { walletId: string; cursor?: string; limit: number };

// Every passenger gets a wallet at sign-up (FR-AUTH-01), so a missing wallet reads as ৳0.
export async function findBalancePaisa(tx: Tx, passengerId: string): Promise<number> {
  const wallet = await findWallet(tx, passengerId);
  return wallet?.balancePaisa ?? 0;
}

export async function findWallet(tx: Tx, passengerId: string): Promise<WalletRow | null> {
  const wallet = await tx.wallet.findUnique({ where: { passengerId } });
  return wallet ? { id: wallet.id, balancePaisa: paisaFromDb(wallet.balancePaisa) } : null;
}

// Adds money and returns the new balance.
export async function creditWallet(tx: Tx, walletId: string, amountPaisa: number): Promise<number> {
  const wallet = await tx.wallet.update({
    where: { id: walletId },
    data: { balancePaisa: { increment: paisaToDb(amountPaisa) } },
  });
  return paisaFromDb(wallet.balancePaisa);
}

// Takes money only if the balance covers it (a guarded debit). Returns the new balance, or null
// when there is not enough money — the balance is then left as it was.
export async function debitWallet(
  tx: Tx,
  walletId: string,
  amountPaisa: number,
): Promise<number | null> {
  const [wallet] = await tx.wallet.updateManyAndReturn({
    where: { id: walletId, balancePaisa: { gte: paisaToDb(amountPaisa) } },
    data: { balancePaisa: { decrement: paisaToDb(amountPaisa) } },
  });
  return wallet ? paisaFromDb(wallet.balancePaisa) : null;
}

export async function insertLedgerEntry(tx: Tx, entry: LedgerEntry): Promise<string> {
  const created = await tx.walletTransaction.create({
    data: {
      ...entry,
      amountPaisa: paisaToDb(entry.amountPaisa),
      balanceAfterPaisa: paisaToDb(entry.balanceAfterPaisa),
    },
    select: { id: true },
  });
  return created.id;
}

// Newest first. Asks for one extra entry to find out whether there is another page.
export async function findLedgerEntries(tx: Tx, page: LedgerPage): Promise<WalletTransaction[]> {
  return tx.walletTransaction.findMany({
    where: { walletId: page.walletId },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: page.limit + 1,
    ...(page.cursor ? { cursor: { id: page.cursor }, skip: 1 } : {}),
  });
}
