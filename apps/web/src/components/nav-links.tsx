'use client';
// The page links in the header. The current page is marked, for sighted and screen-reader users.
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export type NavLink = { href: string; label: string };

// Exactly one link is marked: the most specific one that matches. A section root such as
// /driver is a prefix of every page inside it, so matching on the prefix alone left Dashboard
// marked on Requests, Trip and History as well (NFR-USA-05).
function currentHref(pathname: string, links: NavLink[]): string | null {
  let best: string | null = null;
  for (const { href } of links) {
    const matches = pathname === href || pathname.startsWith(`${href}/`);
    if (matches && (best === null || href.length > best.length)) {
      best = href;
    }
  }
  return best;
}

export function NavLinks({ links }: { links: NavLink[] }) {
  const pathname = usePathname();
  const marked = currentHref(pathname, links);
  return (
    <nav aria-label="Main" className="w-full">
      <ul className="flex flex-wrap gap-2">
        {links.map((link) => {
          const current = link.href === marked;
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
