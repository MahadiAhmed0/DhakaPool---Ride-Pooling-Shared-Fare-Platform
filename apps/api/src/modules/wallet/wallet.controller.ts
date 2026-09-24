// HTTP handlers for the passenger's TeslaPay wallet.
import { pageQuerySchema, type TopUpInput } from '@dhakapool/shared';
import type { Request, Response } from 'express';
import { getStatement, getWallet, topUp } from './wallet.service.ts';

// GET /api/wallet — the balance (FR-PAY-01)
export async function getWalletBalance(req: Request, res: Response): Promise<void> {
  res.status(200).json({ wallet: await getWallet(req.user!.id) });
}

// GET /api/wallet/transactions?cursor=…&limit=… — the statement, newest first (FR-PAY-01)
export async function getWalletTransactions(req: Request, res: Response): Promise<void> {
  const query = pageQuerySchema.parse(req.query);
  res.status(200).json(await getStatement(req.user!.id, query));
}

// POST /api/wallet/topup — add simulated money (FR-PAY-02)
export async function postTopUp(req: Request, res: Response): Promise<void> {
  const { amountPaisa } = req.body as TopUpInput;
  res.status(200).json({ wallet: await topUp(req.user!.id, amountPaisa) });
}
