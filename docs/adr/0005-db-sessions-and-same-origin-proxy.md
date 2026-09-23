# ADR-0005: Server-side DB sessions in an httpOnly cookie, behind a same-origin Next.js proxy

- **Status:** Accepted · 2026-09-24 (chosen by the product owner/developer)
- **Deciders:** Golam Mahadi Ahmed
- **Related:** FR-AUTH-02/03, NFR-SEC-01/02/06, [Architecture §8](../ARCHITECTURE.md#8-security-architecture-nfr-sec-0109-adr-0005)

## Context

Passengers and drivers sign in with e-mail or phone and a password. FR-AUTH-03 requires that sign-out actually invalidates the session. The web app and API run as separate services, on different domains once deployed (Vercel and Railway). Browsers increasingly block third-party cookies.

## Options considered

| Option | Pros | Cons |
|---|---|---|
| **A. Opaque session token in an httpOnly cookie; SHA-256 hash stored in a `sessions` table** | Real revocation (logout, "log out everywhere"). The token is useless if the DB leaks. Simple to implement and reason about. | One indexed DB lookup per request (negligible at MVP scale) |
| B. JWT in an httpOnly cookie | Stateless | Cannot be revoked before expiry without a denylist, which only partly satisfies FR-AUTH-03. Key rotation and claim staleness (e.g. a role change) add complexity. |
| C. Auth library (Auth.js / Lucia / Clerk) | Less code | Built around Next.js rather than a separate Express API. An external SaaS adds a dependency and possibly a cost. It also adds an abstraction layer over session handling. |

## Decision

**Option A**, plus a **same-origin proxy**:
- **Login:**
  - verify the password with bcrypt;
  - create 32 random bytes as a base64url token;
  - store `sha256(token)`, `expires_at = now + SESSION_TTL_HOURS` (default 7 days);
  - set the cookie `dtp_session=<token>; HttpOnly; SameSite=Lax; Path=/; Max-Age=…`, plus `Secure` in production.
- **Each request:** hash the cookie value, load a non-revoked, unexpired session joined with its user, and set `req.user`.
- **Logout:** set `revoked_at = now()` and clear the cookie.
- **Proxy:** the browser only talks to the web origin. Next.js `rewrites` forwards `/api/*` to `API_INTERNAL_URL`, so the cookie is first-party. No CORS, no `SameSite=None`, no third-party-cookie issues.
- **Server components** that need the user (layout guards) call the API's `/api/auth/me` server-to-server and forward the incoming cookie.

## Consequences

- **+** Logout is immediate. A stolen database dump contains no usable tokens.
- **+** A single origin removes a whole class of cookie and CORS bugs in the free-tier deployment.
- **−** Every API call adds a proxy hop through Next.js, a few milliseconds.
- **−** CSRF: `SameSite=Lax` blocks cross-site POSTs carrying the cookie in modern browsers, and the API only accepts `application/json` bodies. A CSRF token is noted as a hardening step, not needed for the MVP.
- **−** The rate limiter and sessions assume one API instance for now (memory store). The sessions themselves are in the DB, so horizontal scaling only needs a shared rate-limit store.

## Revisit when

Several independent services or mobile apps need to authenticate. Then move to short-lived access JWTs plus DB-backed refresh tokens, or to an identity provider.
