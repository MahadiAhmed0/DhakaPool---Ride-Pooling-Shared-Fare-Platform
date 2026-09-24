// Session tokens (ADR-0005). The browser keeps the random token in a cookie; the database keeps only
// its SHA-256 hash, so a copy of the database never contains a usable session.
import { createHash, randomBytes } from 'node:crypto';

const TOKEN_BYTES = 32;

export function createSessionToken(): string {
  return randomBytes(TOKEN_BYTES).toString('base64url');
}

export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
