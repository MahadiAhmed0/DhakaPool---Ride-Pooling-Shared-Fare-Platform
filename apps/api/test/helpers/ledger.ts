// FR-PAY-06, NFR-CON-05: for every wallet, the balance equals the sum of its ledger entries and is
// never below zero. Wallet tests call this after each change.
import { expect } from 'vitest';
import { prisma } from '../../src/db/client.ts';

export async function expectEveryLedgerToMatchItsBalance(): Promise<void> {
  const wallets = await prisma.wallet.findMany({ include: { transactions: true } });
  for (const wallet of wallets) {
    const ledgerTotal = wallet.transactions.reduce((sum, entry) => sum + entry.amountPaisa, 0n);
    expect(ledgerTotal).toBe(wallet.balancePaisa);
    expect(wallet.balancePaisa >= 0n).toBe(true);
  }
}
