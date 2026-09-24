// Sign-in for passengers and drivers (FR-AUTH-02).
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { LoginForm } from './login-form';

export default function LoginPage() {
  return (
    <>
      <Card title="Sign in">
        <LoginForm />
      </Card>
      <p>
        New here?{' '}
        <Link href="/signup" className="font-bold underline">
          Create a passenger account
        </Link>
      </p>
    </>
  );
}
