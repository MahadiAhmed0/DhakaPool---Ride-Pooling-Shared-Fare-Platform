'use client';
// Requesting a ride (FR-PAX-02, FR-PAX-03, FR-PAX-11). It is checked with the same rules as the
// API (rideRequestSchema), shows the live price, and on success the page switches to the tracker.
import { zodResolver } from '@hookform/resolvers/zod';
import { type Gender, rideRequestSchema, type Zone } from '@dhakapool/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { type SubmitHandler, useForm, type UseFormReturn, useWatch } from 'react-hook-form';
import type { z } from 'zod';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/states';
import { api } from '@/lib/api-client';
import { showApiErrors } from '@/lib/form-errors';
import { queryKeys } from '@/lib/query-keys';
import { FareEstimatePanel } from './fare-estimate-panel';
import { PaymentField } from './payment-field';
import { SharingFields } from './sharing-fields';
import { TripFields } from './trip-fields';

export type RideFormValues = z.input<typeof rideRequestSchema>;

const EMPTY_RIDE: RideFormValues = {
  pickupZoneCode: '',
  destinationZoneCode: '',
  seats: 1,
  poolOptIn: true,
  sameGenderOnly: false,
  paymentMethod: 'TESLAPAY',
};

// The choices the live price and the toggles depend on, read as they change.
function useRideChoices(form: UseFormReturn<RideFormValues>) {
  const { control, setValue } = form;
  const [pickupZoneCode, destinationZoneCode, seats, poolOptIn, paymentMethod] = useWatch({
    control,
    name: ['pickupZoneCode', 'destinationZoneCode', 'seats', 'poolOptIn', 'paymentMethod'],
  });
  const isSharing = poolOptIn !== false;
  // FR-PAX-11: a same-gender ride is a kind of shared ride, so it switches off with sharing.
  useEffect(() => {
    if (!isSharing) {
      setValue('sameGenderOnly', false);
    }
  }, [isSharing, setValue]);
  const trip = { pickupZoneCode, destinationZoneCode, seats: Number(seats) || 0 };
  return { trip, isSharing, isTeslaPay: paymentMethod === 'TESLAPAY' };
}

export function RequestRideForm({ zones, gender }: { zones: Zone[]; gender: Gender }) {
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<RideFormValues>({
    resolver: zodResolver(rideRequestSchema),
    defaultValues: EMPTY_RIDE,
  });
  const { register, formState } = form;
  const { trip, isSharing, isTeslaPay } = useRideChoices(form);

  const requestRide: SubmitHandler<RideFormValues> = async (values) => {
    setFormError(null);
    try {
      await api.post('/rides', values);
      await queryClient.invalidateQueries({ queryKey: queryKeys.activeRide });
    } catch (error) {
      setFormError(showApiErrors(error, form.setError));
    }
  };

  const errors = formState.errors;
  return (
    <form onSubmit={form.handleSubmit(requestRide)} noValidate className="flex flex-col gap-5">
      {formError ? <ErrorState message={formError} /> : null}
      <TripFields zones={zones} register={register} errors={errors} />
      <SharingFields gender={gender} isSharing={isSharing} register={register} errors={errors} />
      <PaymentField isTeslaPay={isTeslaPay} register={register} errors={errors} />
      <FareEstimatePanel trip={trip} isSharing={isSharing} />
      <Button type="submit" fullWidth disabled={formState.isSubmitting}>
        {formState.isSubmitting ? 'Requesting…' : 'Request ride'}
      </Button>
    </form>
  );
}
