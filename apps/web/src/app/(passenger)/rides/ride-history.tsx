'use client';
// Past rides, newest first, a page at a time (FR-PAX-09). Only the passenger's own rides exist here.
import { Button, ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { useRideHistory } from '@/lib/passenger-queries';
import { RideHistoryItem } from './ride-history-item';

export function RideHistory() {
  const history = useRideHistory();
  if (history.isPending) {
    return <LoadingState label="Loading your rides…" />;
  }
  if (history.isError) {
    return <ErrorState message={history.error.message} onRetry={() => history.refetch()} />;
  }
  const rides = history.data.pages.flatMap((page) => page.rides);
  return (
    <Card title="My rides">
      {rides.length === 0 ? (
        <EmptyState title="No rides yet">
          <p className="mb-3">Your finished and cancelled rides will appear here.</p>
          <ButtonLink href="/ride">Request a ride</ButtonLink>
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-4">
          {rides.map((ride) => (
            <RideHistoryItem key={ride.id} ride={ride} />
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
