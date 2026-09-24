'use client';
// One ride in full (FR-PAX-10). An active ride shows the live tracker; a finished one shows how it
// ended. Both show the timeline. Another passenger's ride answers "not found" (NFR-SEC-03).
import { isActiveRide, type RideDetail } from '@dhakapool/shared';
import { RideFare } from '@/components/rides/ride-fare';
import { RideTracker } from '@/components/rides/ride-tracker';
import { TripSummary } from '@/components/rides/trip-summary';
import { RideStatusBadge } from '@/components/ui/badge';
import { ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { ApiError } from '@/lib/api-client';
import { formatDateTime } from '@/lib/format';
import { useZoneName } from '@/lib/hooks/use-zone-name';
import { useRide } from '@/lib/passenger-queries';
import { RideTimeline } from './ride-timeline';

function FinishedRide({ ride }: { ride: RideDetail }) {
  const zoneName = useZoneName();
  return (
    <Card title="Ride">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <RideStatusBadge status={ride.status} />
          <span className="font-bold">{formatDateTime(ride.requestedAt)}</span>
        </div>
        <p className="text-lg font-bold">
          {zoneName(ride.pickupZoneCode)} → {zoneName(ride.destinationZoneCode)} · {ride.seats}{' '}
          {ride.seats === 1 ? 'seat' : 'seats'}
        </p>
        {ride.trip ? <TripSummary trip={ride.trip} /> : null}
        <RideFare ride={ride} />
      </div>
    </Card>
  );
}

export function RideDetailView({ rideId }: { rideId: string }) {
  const ride = useRide(rideId);
  if (ride.isPending) {
    return <LoadingState label="Loading the ride…" />;
  }
  if (ride.isError) {
    if (ride.error instanceof ApiError && ride.error.code === 'NOT_FOUND') {
      return (
        <EmptyState title="Ride not found">
          <ButtonLink href="/rides">Back to my rides</ButtonLink>
        </EmptyState>
      );
    }
    return <ErrorState message={ride.error.message} onRetry={() => ride.refetch()} />;
  }
  return (
    <>
      {isActiveRide(ride.data.status) ? (
        <RideTracker ride={ride.data} />
      ) : (
        <FinishedRide ride={ride.data} />
      )}
      <Card title="Timeline">
        <RideTimeline timeline={ride.data.timeline} />
      </Card>
    </>
  );
}
