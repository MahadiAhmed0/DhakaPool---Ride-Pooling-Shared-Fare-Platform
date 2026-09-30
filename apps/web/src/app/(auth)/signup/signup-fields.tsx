// The fields of the sign-up form. Gender is optional and used only to offer same-gender rides;
// it is never shown to other riders or to drivers (FR-PAX-11, A-20).
import type { FieldErrors, UseFormRegister } from 'react-hook-form';
import { Field, Select, TextField } from '@/components/ui/field';
import { PasswordField } from '@/components/ui/password-field';
import type { SignUpFormValues } from './signup-form';

type SignUpFieldsProps = {
  register: UseFormRegister<SignUpFormValues>;
  errors: FieldErrors<SignUpFormValues>;
};

// FR-AUTH-08: the password is typed twice, and either field can be revealed on its own.
function PasswordFields({ register, errors }: SignUpFieldsProps) {
  return (
    <>
      <PasswordField
        id="password"
        label="Password"
        autoComplete="new-password"
        hint="At least 8 characters."
        error={errors.password?.message}
        {...register('password')}
      />
      <PasswordField
        id="confirmPassword"
        label="Confirm password"
        autoComplete="new-password"
        hint="Type it again so a typo cannot lock you out."
        error={errors.confirmPassword?.message}
        {...register('confirmPassword')}
      />
    </>
  );
}

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
      <PasswordFields register={register} errors={errors} />
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
