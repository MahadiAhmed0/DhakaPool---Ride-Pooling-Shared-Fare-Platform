'use client';
// One waiting request and its Accept button (FR-DRV-05). The driver sees the trip but not the
// passenger until they accept (A-20). A refusal, such as "Bullet has only 1 free seat.", comes
// from the API in plain words and is shown as it is.
import type { WaitingRequest } from '@dhakapool/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoneyText } from '@/components/ui/money-text';
import { ErrorState } from '@/components/ui/states';
import { api } from '@/lib/api-client';
import { formatTime } from '@/lib/format';
import { useZoneName } from '@/lib/hooks/use-zone-name';
import { queryKeys } from '@/lib/query-keys';

type WaitingRequestItemProps = { request: WaitingRequest; vehicleName: string };

export function WaitingRequestItem({ request, vehicleName }: WaitingRequestItemProps) {
  const zoneName = useZoneName();
  const queryClient = useQueryClient();
  const accept = useMutation({
    mutationFn: () => api.post(`/driver/requests/${request.id}/accept`),
    // Accepted or refused, the feed and the trip may both have changed.
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.driver }),
  });
  return (
    <li className="flex flex-col gap-3 border-3 border-ink bg-white p-4 shadow-brutal-small">
      <p className="text-lg font-bold">
        {zoneName(request.pickupZoneCode)} → {zoneName(request.destinationZoneCode)}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <span>
          {request.seats} {request.seats === 1 ? 'seat' : 'seats'} · waiting since{' '}
          {formatTime(request.requestedAt)}
        </span>
        <Badge tone={request.poolOptIn ? 'success' : 'plain'}>
          {request.poolOptIn ? 'Happy to share' : 'Rides alone'}
        </Badge>
      </div>
      <p>
        Estimated fare <MoneyText paisa={request.estimatedFarePaisa} />
      </p>
      {accept.isError ? <ErrorState message={accept.error.message} /> : null}
      <Button onClick={() => accept.mutate()} disabled={accept.isPending}>
        {accept.isPending ? 'Accepting…' : `Accept into ${vehicleName}`}
      </Button>
    </li>
  );
}
