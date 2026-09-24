'use client';
// The passenger's home: with no active ride, the request form; with one, where it is (BR-05:
// one active ride at a time, so the form is not offered while a ride is under way).
import Link from 'next/link';
import { RideStatusBadge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { useActiveRide, useCurrentUser, useZones } from '@/lib/passenger-queries';
import { combineQueries } from '@/lib/query-state';
import { RequestRideForm } from './request-ride-form';

export function RideHome() {
  const activeRide = useActiveRide();
  const zones = useZones();
  const user = useCurrentUser();

  const state = combineQueries([activeRide, zones, user]);
  if (state.isPending) {
    return <LoadingState label="Getting ready…" />;
  }
  if (state.error) {
    return <ErrorState message={state.error.message} onRetry={state.retry} />;
  }
  if (activeRide.data) {
    return (
      <Card title="Your ride">
        <RideStatusBadge status={activeRide.data.status} />
        <p className="mt-3">
          <Link href={`/rides/${activeRide.data.id}`} className="font-bold underline">
            Follow your ride
          </Link>
        </p>
      </Card>
    );
  }
  return (
    <Card title="Request a ride">
      <RequestRideForm zones={zones.data ?? []} gender={user.data?.gender ?? 'PREFER_NOT_TO_SAY'} />
    </Card>
  );
}
