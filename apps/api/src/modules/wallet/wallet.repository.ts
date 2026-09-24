// Database queries for TeslaPay wallets.
import { paisaFromDb } from '../../db/money.ts';
import type { Tx } from '../../db/transaction.ts';

// Every passenger gets a wallet at sign-up (FR-AUTH-01), so a missing wallet reads as ৳0.
export async function findBalancePaisa(tx: Tx, passengerId: string): Promise<number> {
  const wallet = await tx.wallet.findUnique({
    where: { passengerId },
    select: { balancePaisa: true },
  });
  return wallet ? paisaFromDb(wallet.balancePaisa) : 0;
}
