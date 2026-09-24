'use client';
// One past ride: when, where, how many seats, how it ended, and what it cost (FR-PAX-09).
import type { RideView } from '@dhakapool/shared';
import Link from 'next/link';
import { Badge, RideStatusBadge } from '@/components/ui/badge';
import { MoneyText } from '@/components/ui/money-text';
import { formatDateTime } from '@/lib/format';
import { useZoneName } from '@/lib/hooks/use-zone-name';
import { PAYMENT_METHOD_LABELS } from '@/lib/labels';

// What the ride finally cost: the fixed fare, or a cancellation fee, or nothing.
function finalCost(ride: RideView): number | null {
  return ride.fare.locked?.totalPaisa ?? ride.fare.cancellationFeePaisa;
}

export function RideHistoryItem({ ride }: { ride: RideView }) {
  const zoneName = useZoneName();
  const cost = finalCost(ride);
  return (
    <li className="border-3 border-ink bg-white p-4 shadow-brutal-small">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-bold">{formatDateTime(ride.requestedAt)}</p>
        <RideStatusBadge status={ride.status} />
      </div>
      <p className="mt-2 text-lg font-bold">
        {zoneName(ride.pickupZoneCode)} → {zoneName(ride.destinationZoneCode)}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span>
          {ride.seats} {ride.seats === 1 ? 'seat' : 'seats'} ·{' '}
          {PAYMENT_METHOD_LABELS[ride.paymentMethod]}
        </span>
        {ride.fare.locked?.pooled ? <Badge tone="success">Shared</Badge> : null}
        {cost === null ? <span>No charge</span> : <MoneyText paisa={cost} />}
      </div>
      <Link href={`/rides/${ride.id}`} className="mt-3 inline-block font-bold underline">
        See the details
      </Link>
    </li>
  );
}
