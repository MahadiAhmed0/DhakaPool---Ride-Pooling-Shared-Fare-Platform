// The fields of the sign-up form. Gender is optional and used only to offer same-gender rides;
// it is never shown to other riders or to drivers (FR-PAX-11, A-20).
import type { FieldErrors, UseFormRegister } from 'react-hook-form';
import { Field, Select, TextField } from '@/components/ui/field';
import type { SignUpFormValues } from './signup-form';

type SignUpFieldsProps = {
  register: UseFormRegister<SignUpFormValues>;
  errors: FieldErrors<SignUpFormValues>;
};

export function SignUpFields({ register, errors }: SignUpFieldsProps) {
  return (
    <>
      <TextField
        id="fullName"
        label="Your name"
        autoComplete="name"
        error={errors.fullName?.message}
        {...register('fullName')}
      />
      <TextField
        id="email"
        label="E-mail"
        type="email"
        autoComplete="email"
        error={errors.email?.message}
        {...register('email')}
      />
      <TextField
        id="phone"
        label="Phone"
        type="tel"
        autoComplete="tel"
        hint="For example +8801711000001"
        error={errors.phone?.message}
        {...register('phone')}
      />
      <TextField
        id="password"
        label="Password"
        type="password"
        autoComplete="new-password"
        hint="At least 8 characters."
        error={errors.password?.message}
        {...register('password')}
      />
      <Field
        id="gender"
        label="Gender (optional)"
        hint="Only used to offer same-gender rides. Never shown to other riders or drivers."
      >
        <Select id="gender" {...register('gender')}>
          <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
          <option value="FEMALE">Female</option>
          <option value="MALE">Male</option>
        </Select>
      </Field>
    </>
  );
}
