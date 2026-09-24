// Sign-up for passengers (FR-AUTH-01). Driver accounts are created by the operator, not here.
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { SignUpForm } from './signup-form';

export default function SignUpPage() {
  return (
    <>
      <Card title="Create a passenger account">
        <SignUpForm />
      </Card>
      <p>
        Already have an account?{' '}
        <Link href="/login" className="font-bold underline">
          Sign in
        </Link>
      </p>
    </>
  );
}
