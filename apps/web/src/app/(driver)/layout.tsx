// Every driver page sits behind this guard (FR-AUTH-05): signed-out visitors go to sign-in,
// and a passenger is sent to the passenger pages. The API checks the role again on every call.
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { AppShell } from '@/components/app-shell';
import { getSignedInUser, homeFor } from '@/lib/server-session';

const DRIVER_LINKS = [
  { href: '/driver', label: 'Dashboard' },
  { href: '/driver/requests', label: 'Requests' },
];

export default async function DriverLayout({ children }: { children: ReactNode }) {
  const user = await getSignedInUser();
  if (!user) {
    redirect('/login');
  }
  if (user.role !== 'DRIVER') {
    redirect(homeFor(user.role));
  }
  return (
    <AppShell userName={user.fullName} links={DRIVER_LINKS}>
      {children}
    </AppShell>
  );
}
