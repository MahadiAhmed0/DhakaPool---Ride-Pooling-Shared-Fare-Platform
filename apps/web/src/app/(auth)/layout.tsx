// Sign-in and sign-up. Someone who is already signed in goes straight to their home page.
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { getSignedInUser, homeFor } from '@/lib/server-session';

export default async function AuthLayout({ children }: { children: ReactNode }) {
  const user = await getSignedInUser();
  if (user) {
    redirect(homeFor(user.role));
  }
  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 px-4 py-10">
      <header>
        <h1 className="text-4xl">Dhaka Tesla Pool</h1>
        <p className="mt-2 font-bold">Share a seat. Split the fare. Survive Dhaka traffic.</p>
      </header>
      {children}
    </main>
  );
}
