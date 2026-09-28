'use client';
// The sign-up form, checked with the same rules as the API (signUpSchema). A new passenger is
// signed in straight away and lands on the ride page.
import { zodResolver } from '@hookform/resolvers/zod';
import { signUpSchema } from '@dhakapool/shared';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { type SubmitHandler, useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/states';
import { api } from '@/lib/api-client';
import { showApiErrors } from '@/lib/form-errors';
import { SignUpFields } from './signup-fields';

// FR-AUTH-08: the password is typed twice. The confirmation is checked here and never sent to
// the API, whose schema accepts the account fields only.
const signUpFormSchema = signUpSchema
  .extend({ confirmPassword: z.string().min(1, 'Please type your password again.') })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'The two passwords do not match.',
  });

export type SignUpFormValues = z.input<typeof signUpFormSchema>;

const EMPTY_FORM: SignUpFormValues = {
  fullName: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
  gender: 'PREFER_NOT_TO_SAY',
};

// The API's schema accepts the account fields only, so the confirmation stays in the browser.
function toAccount({ confirmPassword: _confirmPassword, ...account }: SignUpFormValues) {
  return account;
}

export function SignUpForm() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpFormSchema),
    defaultValues: EMPTY_FORM,
  });
  const { isSubmitting } = form.formState;

  const signUp: SubmitHandler<SignUpFormValues> = async (values) => {
    setFormError(null);
    try {
      await api.post('/auth/signup', toAccount(values));
      router.replace('/ride');
      router.refresh();
    } catch (error) {
      setFormError(showApiErrors(error, form.setError));
    }
  };

  return (
    <form onSubmit={form.handleSubmit(signUp)} noValidate className="flex flex-col gap-4">
      {formError ? <ErrorState message={formError} /> : null}
      <SignUpFields register={form.register} errors={form.formState.errors} />
      <Button type="submit" fullWidth disabled={isSubmitting}>
        {isSubmitting ? 'Creating your account…' : 'Create account'}
      </Button>
    </form>
  );
}
