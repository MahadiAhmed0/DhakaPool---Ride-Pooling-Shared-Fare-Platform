// TeslaPay wallets (FR-PAY-01…06). Other modules use these functions, never the repository.
import type { Tx } from '../../db/transaction.ts';
import { findBalancePaisa } from './wallet.repository.ts';

export async function getBalancePaisa(tx: Tx, passengerId: string): Promise<number> {
  return findBalancePaisa(tx, passengerId);
}
