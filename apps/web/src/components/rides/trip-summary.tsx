'use client';
// Who is driving and whether the Tesla is shared (FR-PAX-06). Co-riders appear only as a number,
// never by name (A-09), and a same-gender trip shows its badge (FR-PAX-11).
import type { GenderRestriction, RideTrip } from '@dhakapool/shared';
import { Badge } from '@/components/ui/badge';

const RESTRICTION_LABELS: Record<Exclude<GenderRestriction, 'NONE'>, string> = {
  FEMALE_ONLY: 'Women-only ride',
  MALE_ONLY: 'Men-only ride',
};

function sharingText(trip: RideTrip): string {
  if (!trip.isShared) {
    return 'Just you in the Tesla so far';
  }
  return `Shared ride · ${trip.coRiderCount} co-rider${trip.coRiderCount === 1 ? '' : 's'}`;
}

export function TripSummary({ trip }: { trip: RideTrip | null }) {
  if (!trip) {
    return (
      <p className="border-3 border-dashed border-ink p-3">
        Waiting for a driver to accept your request.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-2 border-3 border-ink bg-white p-4 shadow-brutal-small">
      <p className="font-display text-lg uppercase">
        {trip.driverName} · {trip.vehicle.name}
      </p>
      <p className="font-bold">Plate {trip.vehicle.plate}</p>
      <div className="flex flex-wrap gap-2">
        <Badge tone={trip.isShared ? 'success' : 'plain'}>{sharingText(trip)}</Badge>
        {trip.genderRestriction === 'NONE' ? null : (
          <Badge tone="warning">{RESTRICTION_LABELS[trip.genderRestriction]}</Badge>
        )}
      </div>
    </div>
  );
}
