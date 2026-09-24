'use client';
// The trip under way (FR-DRV-06): the Tesla, how full it is, every passenger, and the buttons for
// the next step. It refreshes every 4 s, so a passenger who cancels drops off the list by itself.
import type { DriverPoolView } from '@dhakapool/shared';
import { PoolBadges } from '@/components/pools/pool-badges';
import { ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MoneyText } from '@/components/ui/money-text';
import { SeatMeter } from '@/components/ui/seat-meter';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { useActivePool } from '@/lib/driver-queries';
import { useZoneName } from '@/lib/hooks/use-zone-name';
import { PoolActions } from './pool-actions';
import { PoolMemberRow } from './pool-member-row';

function TripHeader({ pool }: { pool: DriverPoolView }) {
  const zoneName = useZoneName();
  return (
    <Card title={`${pool.vehicle.name} · ${pool.vehicle.plate}`} tone="action">
      <div className="flex flex-col gap-3">
        <PoolBadges pool={pool} />
        <p className="font-bold">Pickup in {zoneName(pool.pickupZoneCode)}</p>
        <SeatMeter occupied={pool.occupiedSeats} capacity={pool.capacity} />
        {pool.totalFarePaisa > 0 ? (
          <p>
            Fares on this trip <MoneyText paisa={pool.totalFarePaisa} />
          </p>
        ) : null}
        <PoolActions pool={pool} />
      </div>
    </Card>
  );
}

export function ActivePool() {
  const pool = useActivePool();
  if (pool.isPending) {
    return <LoadingState label="Loading your trip…" />;
  }
  if (pool.isError) {
    return <ErrorState message={pool.error.message} onRetry={() => pool.refetch()} />;
  }
  if (!pool.data) {
    return (
      <EmptyState title="No trip under way">
        <p className="mb-3">Accept a waiting request to start a trip.</p>
        <ButtonLink href="/driver/requests">See waiting requests</ButtonLink>
      </EmptyState>
    );
  }
  const trip = pool.data;
  return (
    <>
      <TripHeader pool={trip} />
      <Card title="Passengers">
        <ul className="flex flex-col gap-4">
          {trip.members.map((member) => (
            <PoolMemberRow key={member.rideId} poolId={trip.id} member={member} />
          ))}
        </ul>
      </Card>
    </>
  );
}
