'use client';
// Adding simulated money to TeslaPay (FR-PAY-02). People think in taka, so the form asks for taka
// and sends paisa. The limits are the shared BR-17 ones the API also checks.
import { zodResolver } from '@hookform/resolvers/zod';
import { formatPaisa, PAISA_PER_TAKA, TOP_UP_MAX_PAISA, TOP_UP_MIN_PAISA } from '@dhakapool/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { type SubmitHandler, useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/field';
import { ErrorState } from '@/components/ui/states';
import { api } from '@/lib/api-client';
import { messageOf } from '@/lib/form-errors';
import { queryKeys } from '@/lib/query-keys';

const LIMITS_MESSAGE = `Top up between ${formatPaisa(TOP_UP_MIN_PAISA)} and ${formatPaisa(TOP_UP_MAX_PAISA)}.`;

const topUpFormSchema = z.object({
  amountTaka: z
    .number({ error: 'Enter an amount in taka.' })
    .min(TOP_UP_MIN_PAISA / PAISA_PER_TAKA, LIMITS_MESSAGE)
    .max(TOP_UP_MAX_PAISA / PAISA_PER_TAKA, LIMITS_MESSAGE),
});
type TopUpFormValues = z.infer<typeof topUpFormSchema>;

export function TopUpForm() {
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);
  const [lastTopUpPaisa, setLastTopUpPaisa] = useState<number | null>(null);
  const form = useForm<TopUpFormValues>({ resolver: zodResolver(topUpFormSchema) });
  const { formState } = form;

  const topUp: SubmitHandler<TopUpFormValues> = async ({ amountTaka }) => {
    setFormError(null);
    setLastTopUpPaisa(null);
    const amountPaisa = Math.round(amountTaka * PAISA_PER_TAKA);
    try {
      await api.post('/wallet/topup', { amountPaisa });
      await queryClient.invalidateQueries({ queryKey: queryKeys.wallet });
      setLastTopUpPaisa(amountPaisa);
      form.reset();
    } catch (error) {
      setFormError(messageOf(error));
    }
  };

  const amountError = formState.errors.amountTaka?.message;
  return (
    <form onSubmit={form.handleSubmit(topUp)} noValidate className="flex flex-col gap-4">
      {formError ? <ErrorState message={formError} /> : null}
      {lastTopUpPaisa !== null ? (
        <p role="status" className="border-3 border-ink bg-success px-3 py-2 font-bold">
          Added {formatPaisa(lastTopUpPaisa)} to TeslaPay.
        </p>
      ) : null}
      <TextField
        id="amountTaka"
        label="Top-up amount (৳)"
        type="number"
        inputMode="decimal"
        step="0.01"
        hint={LIMITS_MESSAGE}
        error={amountError}
        {...form.register('amountTaka', { valueAsNumber: true })}
      />
      <Button type="submit" variant="secondary" disabled={formState.isSubmitting}>
        {formState.isSubmitting ? 'Adding…' : 'Add money'}
      </Button>
    </form>
  );
}
