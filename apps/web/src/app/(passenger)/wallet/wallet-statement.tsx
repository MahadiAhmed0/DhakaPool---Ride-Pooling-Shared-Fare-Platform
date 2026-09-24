'use client';
// The TeslaPay statement, newest first, a page at a time (FR-PAY-01). Each line shows the balance
// after it, so the passenger can follow every change (FR-PAY-06).
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { useWalletStatement } from '@/lib/passenger-queries';
import { StatementItem } from './statement-item';

export function WalletStatementList() {
  const statement = useWalletStatement();
  if (statement.isPending) {
    return <LoadingState label="Loading your statement…" />;
  }
  if (statement.isError) {
    return <ErrorState message={statement.error.message} onRetry={() => statement.refetch()} />;
  }
  const transactions = statement.data.pages.flatMap((page) => page.transactions);
  return (
    <Card title="Statement">
      {transactions.length === 0 ? (
        <EmptyState title="No transactions yet">
          <p>Top-ups, ride payments and fees will appear here.</p>
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-3">
          {transactions.map((transaction) => (
            <StatementItem key={transaction.id} transaction={transaction} />
          ))}
        </ul>
      )}
      {statement.hasNextPage ? (
        <Button
          variant="secondary"
          className="mt-4"
          onClick={() => statement.fetchNextPage()}
          disabled={statement.isFetchingNextPage}
        >
          {statement.isFetchingNextPage ? 'Loading…' : 'Show more'}
        </Button>
      ) : null}
    </Card>
  );
}
