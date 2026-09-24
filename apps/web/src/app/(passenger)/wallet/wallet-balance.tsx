'use client';
// The TeslaPay balance and the top-up form (FR-PAY-01, FR-PAY-02). TeslaPay is simulated: no real
// money moves, and the page says so.
import { Card } from '@/components/ui/card';
import { MoneyText } from '@/components/ui/money-text';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { useWallet } from '@/lib/passenger-queries';
import { TopUpForm } from './top-up-form';

export function WalletBalance() {
  const wallet = useWallet();
  if (wallet.isPending) {
    return <LoadingState label="Loading your balance…" />;
  }
  if (wallet.isError) {
    return <ErrorState message={wallet.error.message} onRetry={() => wallet.refetch()} />;
  }
  return (
    <Card title="TeslaPay" tone="action">
      <p className="font-bold uppercase tracking-wide">Balance</p>
      <MoneyText paisa={wallet.data.balancePaisa} className="font-display text-4xl" />
      <p className="mt-2 text-sm">
        Simulated wallet: top-ups are free and no real money is charged.
      </p>
      <div className="mt-5 border-t-3 border-ink pt-5">
        <TopUpForm />
      </div>
    </Card>
  );
}
