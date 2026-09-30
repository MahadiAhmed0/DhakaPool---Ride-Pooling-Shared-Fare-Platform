'use client';
// The sign-in form. It is checked with the same rules as the API (logInSchema), and a wrong
// password or unknown account gets one message, so nobody can find out which accounts exist.
import { zodResolver } from '@hookform/resolvers/zod';
import { type CurrentUser, type LogInInput, logInSchema } from '@dhakapool/shared';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/field';
import { PasswordField } from '@/components/ui/password-field';
import { ErrorState } from '@/components/ui/states';
import { api } from '@/lib/api-client';
import { messageOf } from '@/lib/form-errors';

const HOME_FOR_ROLE = { PASSENGER: '/ride', DRIVER: '/driver' } as const;

export function LoginForm() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<LogInInput>({
    resolver: zodResolver(logInSchema),
    defaultValues: { emailOrPhone: '', password: '' },
  });
  const { errors, isSubmitting } = formState;

  async function signIn(values: LogInInput): Promise<void> {
    setFormError(null);
    try {
      const { user } = await api.post<{ user: CurrentUser }>('/auth/login', values);
      router.replace(HOME_FOR_ROLE[user.role]);
      router.refresh();
    } catch (error) {
      setFormError(messageOf(error));
    }
  }

  return (
    <form onSubmit={handleSubmit(signIn)} noValidate className="flex flex-col gap-4">
      {formError ? <ErrorState message={formError} /> : null}
      <TextField
        id="emailOrPhone"
        label="E-mail or phone"
        autoComplete="username"
        error={errors.emailOrPhone?.message}
        {...register('emailOrPhone')}
      />
      <PasswordField
        id="password"
        label="Password"
        autoComplete="current-password"
        error={errors.password?.message}
        {...register('password')}
      />
      <Button type="submit" fullWidth disabled={isSubmitting}>
        {isSubmitting ? 'Signing in…' : 'Sign in'}
      </Button>
      <DemoAccountsHint />
    </form>
  );
}

// SRS §8.1: the demo accounts are shown outside production only.
function DemoAccountsHint() {
  if (process.env.NODE_ENV === 'production') {
    return null;
  }
  return (
    <p className="border-3 border-dashed border-ink bg-info/30 p-3 text-sm">
      Demo accounts (password <strong>TeslaPool#2026</strong>): nusrat@dhakapool.test,
      rafiq@dhakapool.test, shirin@dhakapool.test (passengers); jashim@dhakapool.test,
      kamal@dhakapool.test (drivers).
    </p>
  );
}
