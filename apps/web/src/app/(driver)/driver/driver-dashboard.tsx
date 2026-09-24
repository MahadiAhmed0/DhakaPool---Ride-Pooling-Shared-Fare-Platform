'use client';
// The driver's dashboard (FR-DRV-01): which Tesla they drive, whether they are online and where,
// and whether a trip is under way.
import type { DriverStatus } from '@dhakapool/shared';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { SeatMeter } from '@/components/ui/seat-meter';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { useDriverStatus } from '@/lib/driver-queries';
import { POOL_STATUS_LABELS } from '@/lib/labels';
import { useZones } from '@/lib/passenger-queries';
import { combineQueries } from '@/lib/query-state';
import { AvailabilityForm } from './availability-form';

function TeslaCard({ driver }: { driver: DriverStatus }) {
  const { vehicle } = driver;
  const isOnline = driver.availability === 'ONLINE';
  return (
    <Card title="Your Tesla" tone="action">
      <p className="font-display text-2xl uppercase">{vehicle.name}</p>
      <p className="font-bold">
        Plate {vehicle.plate} · {vehicle.capacity} seats
      </p>
      <div className="mt-3">
        <Badge tone={isOnline ? 'success' : 'muted'}>{isOnline ? 'Online' : 'Offline'}</Badge>
      </div>
    </Card>
  );
}

function ActiveTripNote({ trip }: { trip: NonNullable<DriverStatus['activePool']> }) {
  return (
    <Card title="Trip under way" tone="info">
      <p className="mb-3 font-bold">{POOL_STATUS_LABELS[trip.status]}</p>
      <SeatMeter occupied={trip.occupiedSeats} capacity={trip.capacity} />
    </Card>
  );
}

export function DriverDashboard() {
  const status = useDriverStatus();
  const zones = useZones();
  const state = combineQueries([status, zones]);
  if (state.isPending) {
    return <LoadingState label="Loading your Tesla…" />;
  }
  if (state.error || !status.data) {
    return (
      <ErrorState
        message={state.error?.message ?? 'We could not load your Tesla.'}
        onRetry={state.retry}
      />
    );
  }
  const driver = status.data;
  return (
    <>
      <TeslaCard driver={driver} />
      {driver.activePool ? <ActiveTripNote trip={driver.activePool} /> : null}
      <Card title="Availability">
        <AvailabilityForm driver={driver} zones={zones.data ?? []} />
      </Card>
    </>
  );
}
