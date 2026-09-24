// Routes of the wallet module (SRS §8.2). For signed-in passengers, and always their own wallet.
import { topUpSchema } from '@dhakapool/shared';
import { Router } from 'express';
import { requireRole } from '../../middleware/require-auth.ts';
import { validateBody } from '../../middleware/validate.ts';
import { getWalletBalance, getWalletTransactions, postTopUp } from './wallet.controller.ts';

export const walletRouter = Router();

walletRouter.use(requireRole('PASSENGER'));
walletRouter.get('/', getWalletBalance);
walletRouter.get('/transactions', getWalletTransactions);
walletRouter.post('/topup', validateBody(topUpSchema), postTopUp);
