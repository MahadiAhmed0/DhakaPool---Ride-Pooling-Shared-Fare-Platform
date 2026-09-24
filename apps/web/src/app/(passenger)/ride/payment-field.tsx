'use client';
// How the passenger pays: TeslaPay (the simulated wallet) or cash to the driver. With TeslaPay the
// balance is shown, because a request is refused when it cannot cover the solo fare (FR-PAX-05).
import type { FieldErrors, UseFormRegister } from 'react-hook-form';
import Link from 'next/link';
import { Field, Select } from '@/components/ui/field';
import { MoneyText } from '@/components/ui/money-text';
import { useWallet } from '@/lib/passenger-queries';
import type { RideFormValues } from './request-ride-form';

type PaymentFieldProps = {
  isTeslaPay: boolean;
  register: UseFormRegister<RideFormValues>;
  errors: FieldErrors<RideFormValues>;
};

function WalletBalance() {
  const wallet = useWallet();
  if (!wallet.data) {
    return null;
  }
  return (
    <p className="text-sm">
      TeslaPay balance: <MoneyText paisa={wallet.data.balancePaisa} /> ·{' '}
      <Link href="/wallet" className="font-bold underline">
        Top up
      </Link>
    </p>
  );
}

export function PaymentField({ isTeslaPay, register, errors }: PaymentFieldProps) {
  return (
    <Field id="paymentMethod" label="Pay with" error={errors.paymentMethod?.message}>
      <Select id="paymentMethod" {...register('paymentMethod')}>
        <option value="TESLAPAY">TeslaPay (simulated wallet)</option>
        <option value="CASH">Cash to the driver</option>
      </Select>
      {isTeslaPay ? <WalletBalance /> : null}
    </Field>
  );
}
