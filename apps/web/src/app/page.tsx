// The front door: signed-in people go to their role's home page, everyone else to sign-in.
import { redirect } from 'next/navigation';
import { getSignedInUser, homeFor } from '@/lib/server-session';

export default async function HomePage() {
  const user = await getSignedInUser();
  redirect(user ? homeFor(user.role) : '/login');
}
