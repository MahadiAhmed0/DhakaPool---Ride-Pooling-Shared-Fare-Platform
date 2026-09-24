// The frame around every signed-in page: the brand, the pages for this role, and sign-out.
// Mobile first: at 360 px the navigation wraps under the brand (NFR-USA-05).
import type { ReactNode } from 'react';
import { NavLinks, type NavLink } from './nav-links';
import { SignOutButton } from './sign-out-button';

type AppShellProps = { userName: string; links: NavLink[]; children: ReactNode };

export function AppShell({ userName, links, children }: AppShellProps) {
  return (
    <div className="min-h-screen">
      <header className="border-b-3 border-ink bg-action">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <p className="font-display text-lg uppercase">Dhaka Tesla Pool</p>
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold">Hi, {userName}</span>
            <SignOutButton />
          </div>
          <NavLinks links={links} />
        </div>
      </header>
      <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6">{children}</main>
    </div>
  );
}
