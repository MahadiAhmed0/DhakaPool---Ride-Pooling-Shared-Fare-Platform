'use client';
// The passenger's live ride (FR-PAX-06, FR-PAX-07): where it is on its way, the driver and Tesla,
// the fare, and cancel while allowed. The data refreshes every 4 s while the ride is active.
import type { RideView } from '@dhakapool/shared';
import { Card } from '@/components/ui/card';
import { StatusStepper } from '@/components/ui/status-stepper';
import { formatTime } from '@/lib/format';
import { useZoneName } from '@/lib/hooks/use-zone-name';
import { PAYMENT_METHOD_LABELS } from '@/lib/labels';
import { CancelRideButton } from './cancel-ride-button';
import { RideFare } from './ride-fare';
import { TripSummary } from './trip-summary';

export function RideTracker({ ride }: { ride: RideView }) {
  const zoneName = useZoneName();
  return (
    <Card title="Your ride">
      <div className="flex flex-col gap-5">
        <StatusStepper status={ride.status} />
        <p className="text-lg font-bold">
          {zoneName(ride.pickupZoneCode)} → {zoneName(ride.destinationZoneCode)}
        </p>
        <p>
          {ride.seats} {ride.seats === 1 ? 'seat' : 'seats'} ·{' '}
          {PAYMENT_METHOD_LABELS[ride.paymentMethod]}
          {ride.status === 'REQUESTED'
            ? ` · waiting for a driver until ${formatTime(ride.expiresAt)}`
            : ''}
        </p>
        <TripSummary trip={ride.trip} />
        <RideFare ride={ride} />
        <CancelRideButton ride={ride} />
      </div>
    </Card>
  );
}
