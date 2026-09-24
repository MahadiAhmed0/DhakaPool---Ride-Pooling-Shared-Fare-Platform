// Row locks (SELECT … FOR UPDATE) — the only place in the API where locks are taken (ADR-0006).
//
// RULE: always lock in this order inside one transaction:  driver → pool → ride → wallet.
// Following one fixed order means two transactions can never wait for each other forever (deadlock).
// Each function returns true when the row exists and is now locked until the transaction ends.
import type { Tx } from './transaction.ts';

type LockedRow = { id: string };

export async function lockDriver(tx: Tx, driverId: string): Promise<boolean> {
  const rows = await tx.$queryRaw<LockedRow[]>`
    SELECT user_id::text AS id FROM driver_profiles WHERE user_id = ${driverId}::uuid FOR UPDATE`;
  return rows.length > 0;
}

export async function lockPool(tx: Tx, poolId: string): Promise<boolean> {
  const rows = await tx.$queryRaw<LockedRow[]>`
    SELECT id::text AS id FROM pools WHERE id = ${poolId}::uuid FOR UPDATE`;
  return rows.length > 0;
}

export async function lockWallet(tx: Tx, walletId: string): Promise<boolean> {
  const rows = await tx.$queryRaw<LockedRow[]>`
    SELECT id::text AS id FROM wallets WHERE id = ${walletId}::uuid FOR UPDATE`;
  return rows.length > 0;
}
