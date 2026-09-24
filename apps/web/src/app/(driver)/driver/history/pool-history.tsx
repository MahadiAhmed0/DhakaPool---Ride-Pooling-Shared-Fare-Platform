'use client';
// Past trips, newest first, a page at a time (FR-DRV-13). Only this driver's own trips exist here.
import { Button, ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { usePoolHistory } from '@/lib/driver-queries';
import { PoolHistoryItem } from './pool-history-item';

export function PoolHistory() {
  const history = usePoolHistory();
  if (history.isPending) {
    return <LoadingState label="Loading your trips…" />;
  }
  if (history.isError) {
    return <ErrorState message={history.error.message} onRetry={() => history.refetch()} />;
  }
  const pools = history.data.pages.flatMap((page) => page.pools);
  return (
    <Card title="Trip history">
      {pools.length === 0 ? (
        <EmptyState title="No trips yet">
          <p className="mb-3">Your completed and cancelled trips will appear here.</p>
          <ButtonLink href="/driver/requests">See waiting requests</ButtonLink>
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-4">
          {pools.map((pool) => (
            <PoolHistoryItem key={pool.id} pool={pool} />
          ))}
        </ul>
      )}
      {history.hasNextPage ? (
        <Button
          variant="secondary"
          className="mt-4"
          onClick={() => history.fetchNextPage()}
          disabled={history.isFetchingNextPage}
        >
          {history.isFetchingNextPage ? 'Loading…' : 'Show more'}
        </Button>
      ) : null}
    </Card>
  );
}
