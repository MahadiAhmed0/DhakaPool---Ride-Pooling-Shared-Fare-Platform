'use client';
// The page links in the header. The current page is marked, for sighted and screen-reader users.
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export type NavLink = { href: string; label: string };

function isCurrent(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function NavLinks({ links }: { links: NavLink[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="w-full">
      <ul className="flex flex-wrap gap-2">
        {links.map((link) => {
          const current = isCurrent(pathname, link.href);
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={current ? 'page' : undefined}
                className={`inline-block border-3 border-ink px-3 py-1 font-bold uppercase ${current ? 'bg-ink text-page' : 'bg-white'}`}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
