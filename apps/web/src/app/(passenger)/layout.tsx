// Every passenger page sits behind this guard (FR-AUTH-05): signed-out visitors go to sign-in,
// and a driver is sent to the driver pages. The API checks the role again on every call.
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { AppShell } from '@/components/app-shell';
import { getSignedInUser, homeFor } from '@/lib/server-session';

const PASSENGER_LINKS = [
  { href: '/ride', label: 'Ride' },
  { href: '/rides', label: 'My rides' },
  { href: '/wallet', label: 'TeslaPay' },
];

export default async function PassengerLayout({ children }: { children: ReactNode }) {
  const user = await getSignedInUser();
  if (!user) {
    redirect('/login');
  }
  if (user.role !== 'PASSENGER') {
    redirect(homeFor(user.role));
  }
  return (
    <AppShell userName={user.fullName} links={PASSENGER_LINKS}>
      {children}
    </AppShell>
  );
}
