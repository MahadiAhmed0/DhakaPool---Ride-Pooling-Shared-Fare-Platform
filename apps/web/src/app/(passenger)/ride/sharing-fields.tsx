// "Share my ride" and the same-gender option (FR-PAX-03, FR-PAX-11). The same-gender option is
// offered only to passengers who declared a gender, and only while sharing is on.
import type { Gender } from '@dhakapool/shared';
import type { FieldErrors, UseFormRegister } from 'react-hook-form';
import { Toggle } from '@/components/ui/toggle';
import type { RideFormValues } from './request-ride-form';

type SharingFieldsProps = {
  gender: Gender;
  isSharing: boolean;
  register: UseFormRegister<RideFormValues>;
  errors: FieldErrors<RideFormValues>;
};

const SAME_GENDER_LABELS: Record<Exclude<Gender, 'PREFER_NOT_TO_SAY'>, string> = {
  FEMALE: 'Women-only ride',
  MALE: 'Men-only ride',
};

export function SharingFields({ gender, isSharing, register, errors }: SharingFieldsProps) {
  return (
    <div className="flex flex-col gap-3">
      <Toggle
        id="poolOptIn"
        label="Share my ride"
        hint="Ride with others going the same way and save 20 % of the distance charge."
        {...register('poolOptIn')}
      />
      {gender === 'PREFER_NOT_TO_SAY' ? null : (
        <Toggle
          id="sameGenderOnly"
          label={SAME_GENDER_LABELS[gender]}
          hint={
            isSharing ? 'Only share with riders of your gender.' : 'Needs "Share my ride" to be on.'
          }
          disabled={!isSharing}
          {...register('sameGenderOnly')}
        />
      )}
      {errors.sameGenderOnly?.message ? (
        <p role="alert" className="border-3 border-ink bg-danger px-2 py-1 font-bold">
          {errors.sameGenderOnly.message}
        </p>
      ) : null}
    </div>
  );
}
