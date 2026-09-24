// One ledger line: what it was, when, the signed amount, and the balance after it (FR-PAY-01).
import {
  formatPaisa,
  type WalletTransactionType,
  type WalletTransactionView,
} from '@dhakapool/shared';
import Link from 'next/link';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { formatDateTime } from '@/lib/format';

const TYPE_LABELS: Record<WalletTransactionType, string> = {
  TOPUP: 'Top-up',
  RIDE_PAYMENT: 'Ride payment',
  CANCELLATION_FEE: 'Cancellation fee',
};

const TYPE_TONES: Record<WalletTransactionType, BadgeTone> = {
  TOPUP: 'success',
  RIDE_PAYMENT: 'info',
  CANCELLATION_FEE: 'warning',
};

// The seeded demo balance is stored as a top-up with reason SEED (FR-PAY-06).
function labelOf(transaction: WalletTransactionView): string {
  return transaction.reason === 'SEED' ? 'Starting balance' : TYPE_LABELS[transaction.type];
}

function signedAmount(amountPaisa: number): string {
  return amountPaisa > 0 ? `+${formatPaisa(amountPaisa)}` : formatPaisa(amountPaisa);
}

export function StatementItem({ transaction }: { transaction: WalletTransactionView }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 border-3 border-ink bg-white p-3 shadow-brutal-small">
      <div className="flex flex-col gap-1">
        <Badge tone={TYPE_TONES[transaction.type]}>{labelOf(transaction)}</Badge>
        <span className="text-sm">{formatDateTime(transaction.createdAt)}</span>
        {transaction.rideId ? (
          <Link href={`/rides/${transaction.rideId}`} className="text-sm font-bold underline">
            See the ride
          </Link>
        ) : null}
      </div>
      <div className="text-right">
        <p className="text-lg font-bold tabular-nums">{signedAmount(transaction.amountPaisa)}</p>
        <p className="text-sm tabular-nums">Balance {formatPaisa(transaction.balanceAfterPaisa)}</p>
      </div>
    </li>
  );
}
