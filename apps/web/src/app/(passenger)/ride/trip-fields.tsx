// Where from, where to, and how many seats (FR-PAX-03). Only the seeded zones can be chosen
// (FR-PAX-01).
import { MAX_SEATS_PER_REQUEST, type Zone } from '@dhakapool/shared';
import type { FieldErrors, UseFormRegister } from 'react-hook-form';
import { Field, Select } from '@/components/ui/field';
import type { RideFormValues } from './request-ride-form';

type TripFieldsProps = {
  zones: Zone[];
  register: UseFormRegister<RideFormValues>;
  errors: FieldErrors<RideFormValues>;
};

const SEAT_CHOICES = Array.from({ length: MAX_SEATS_PER_REQUEST }, (_, index) => index + 1);

function ZoneOptions({ zones }: { zones: Zone[] }) {
  return (
    <>
      <option value="">Choose a zone…</option>
      {zones.map((zone) => (
        <option key={zone.code} value={zone.code}>
          {zone.name}
        </option>
      ))}
    </>
  );
}

export function TripFields({ zones, register, errors }: TripFieldsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field id="pickupZoneCode" label="Pickup" error={errors.pickupZoneCode?.message}>
        <Select
          id="pickupZoneCode"
          aria-invalid={Boolean(errors.pickupZoneCode)}
          {...register('pickupZoneCode')}
        >
          <ZoneOptions zones={zones} />
        </Select>
      </Field>
      <Field
        id="destinationZoneCode"
        label="Destination"
        error={errors.destinationZoneCode?.message}
      >
        <Select
          id="destinationZoneCode"
          aria-invalid={Boolean(errors.destinationZoneCode)}
          {...register('destinationZoneCode')}
        >
          <ZoneOptions zones={zones} />
        </Select>
      </Field>
      <Field id="seats" label="Seats" error={errors.seats?.message}>
        <Select
          id="seats"
          aria-invalid={Boolean(errors.seats)}
          {...register('seats', { valueAsNumber: true })}
        >
          {SEAT_CHOICES.map((seats) => (
            <option key={seats} value={seats}>
              {seats} {seats === 1 ? 'seat' : 'seats'}
            </option>
          ))}
        </Select>
      </Field>
    </div>
  );
}
