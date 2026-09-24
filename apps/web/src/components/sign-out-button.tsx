'use client';
// Signs out (FR-AUTH-03): the API revokes the session, and the cached data of this user is dropped.
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/lib/api-client';
import { Button } from './ui/button';

export function SignOutButton() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function signOut(): Promise<void> {
    setIsSigningOut(true);
    await api.post('/auth/logout').catch(() => undefined); // signed out locally either way
    queryClient.clear();
    router.replace('/login');
    router.refresh();
  }

  return (
    <Button
      variant="secondary"
      className="px-3 py-1 text-sm"
      onClick={signOut}
      disabled={isSigningOut}
    >
      {isSigningOut ? 'Signing out…' : 'Sign out'}
    </Button>
  );
}
