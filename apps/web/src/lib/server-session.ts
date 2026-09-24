// Finds out, on the server, who is signed in (FR-AUTH-05). The browser's session cookie is passed
// to the API's /me endpoint. Used only by layouts, to guard pages and to redirect by role.
import { type CurrentUser, SESSION_COOKIE_NAME, type UserRole } from '@dhakapool/shared';
import { cookies } from 'next/headers';

const HTTP_UNAUTHORIZED = 401;

// Inside Docker the API is at http://api:4000; on a developer machine it is localhost.
function apiInternalUrl(): string {
  return process.env['API_INTERNAL_URL'] ?? 'http://localhost:4000';
}

export async function getSignedInUser(): Promise<CurrentUser | null> {
  const session = (await cookies()).get(SESSION_COOKIE_NAME);
  if (!session) {
    return null;
  }
  const response = await fetch(`${apiInternalUrl()}/api/auth/me`, {
    headers: { cookie: `${SESSION_COOKIE_NAME}=${session.value}` },
    cache: 'no-store',
  });
  if (response.status === HTTP_UNAUTHORIZED) {
    return null; // signed out or expired
  }
  if (!response.ok) {
    throw new Error(`The API answered ${response.status} when checking the session.`);
  }
  return ((await response.json()) as { user: CurrentUser }).user;
}

// Each role has its own home page.
export function homeFor(role: UserRole): string {
  return role === 'DRIVER' ? '/driver' : '/ride';
}
