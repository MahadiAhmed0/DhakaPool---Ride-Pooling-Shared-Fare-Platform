'use client';
// The request feed (FR-DRV-04). It refreshes every 4 s while the driver is online. With a trip
// forming, the API lists only the requests that can still join it, so every Accept can succeed
// unless another driver was faster.
import { ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { useDriverRequests, useDriverStatus } from '@/lib/driver-queries';
import { WaitingRequestItem } from './waiting-request-item';

function OfflineNote() {
  return (
    <EmptyState title="You are offline">
      <p className="mb-3">Go online in your zone to see waiting requests.</p>
      <ButtonLink href="/driver">Go to the dashboard</ButtonLink>
    </EmptyState>
  );
}

export function RequestFeed() {
  const status = useDriverStatus();
  const isOnline = status.data?.availability === 'ONLINE';
  const requests = useDriverRequests(isOnline);
  if (status.isPending) {
    return <LoadingState label="Loading your status…" />;
  }
  if (status.isError) {
    return <ErrorState message={status.error.message} onRetry={() => status.refetch()} />;
  }
  if (!isOnline) {
    return <OfflineNote />;
  }
  if (requests.isPending) {
    return <LoadingState label="Looking for passengers…" />;
  }
  if (requests.isError) {
    return <ErrorState message={requests.error.message} onRetry={() => requests.refetch()} />;
  }
  return (
    <Card title="Waiting requests">
      {requests.data.length === 0 ? (
        <EmptyState title="No requests right now">
          <p>New requests in your zone appear here by themselves.</p>
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-4">
          {requests.data.map((request) => (
            <WaitingRequestItem
              key={request.id}
              request={request}
              vehicleName={status.data.vehicle.name}
            />
          ))}
        </ul>
      )}
    </Card>
  );
}
