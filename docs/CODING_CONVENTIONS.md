# Coding Conventions — Dhaka Tesla Pool

| Field | Value |
|---|---|
| Document ID | DTP-CONV-001 |
| Version | 1.0 |
| Applies to | `apps/api`, `apps/web`, `packages/shared` |
| Related | [SRS](SRS.md) · [Architecture](ARCHITECTURE.md) · [ADRs](adr/README.md) |

## 1. Purpose

The codebase must be easy to read and safe to change for someone who has never seen it before. Every file should be understandable top to bottom without jumping around, and every business rule should be traceable back to the SRS. When in doubt, choose the most obvious code, not the most clever.

## 2. Principles

| # | Principle | In practice |
|---|---|---|
| P-1 | **One file, one job** | A file does one thing, such as the fare formula or the ride routes. Keep files around 150 lines. ESLint stops at 200. |
| P-2 | **Small functions** | Keep functions around 40 lines. ESLint stops at 50. Split a long function into named steps. |
| P-3 | **Flat logic** | Use early returns instead of nested `if`s (maximum depth 3). No nested ternaries. Cyclomatic complexity stays at 8 or below. |
| P-4 | **Same shape everywhere** | Every API module has the same four files (§4). Once you have read one module, you know them all. |
| P-5 | **No clever abstractions** | No generic base classes, decorators, dependency-injection containers, metaprogramming or "utils" dumping grounds. Use plain functions and plain objects. |
| P-6 | **Rules are visible** | Every business rule cites its SRS ID in a comment. Every rule value lives in `apps/api/src/config/rules.ts`. |

## 3. Project map

| Folder | What lives there |
|---|---|
| `apps/api/src/config/` | `env.ts` (validated environment variables) and `rules.ts` (business constants) |
| `apps/api/src/domain/` | Pure business logic (fare, matching, state machine, errors). No database, no HTTP. |
| `apps/api/src/modules/<name>/` | One folder per feature: routes, controller, service, repository |
| `apps/api/src/middleware/` | Request pipeline steps (request id, logging, auth, validation, errors) |
| `apps/api/src/db/` | Prisma client, transactions, row locks, database error mapping |
| `apps/api/test/` | Automated tests, written with the reference personas |
| `apps/web/src/app/` | Pages (Next.js App Router) |
| `apps/web/src/components/` | UI components. `ui/` holds the shared neo-brutalist kit. |
| `packages/shared/src/` | Types, enums and validation schemas used by both the API and the web app |

## 4. API module template

Every module under `apps/api/src/modules/` follows the same flow:

```text
<name>.routes.ts      → which URL, which middleware (auth, role, validation)
<name>.controller.ts  → read the validated input, call the service, send the response
<name>.service.ts     → the business steps, the transaction, ownership checks, audit
<name>.repository.ts  → database queries only
```

| File | Allowed to | Not allowed to |
|---|---|---|
| routes | connect a URL to a controller function | contain logic |
| controller | read `req`, call one service function, shape the JSON response | open transactions, query the database, decide business rules |
| service | call repositories, domain functions and other services | use `req` or `res` |
| repository | run Prisma queries with the transaction it is given | contain business rules |

## 5. Naming

| Thing | Convention | Example |
|---|---|---|
| Files | `kebab-case` plus role suffix | `ride.service.ts`, `state-machine.ts` |
| Functions | verb first, plain English | `acceptRequest`, `computeFare`, `lockPool` |
| Booleans | read as a question | `isPooled`, `hasFreeSeat`, `canCancel` |
| Money | always paisa, suffix `Paisa` | `totalPaisa`, `baseFarePaisa` |
| Distances | always metres, suffix `M` | `distanceM` |
| Constants | `UPPER_SNAKE_CASE` | `REQUEST_EXPIRY_MINUTES` |
| Test helpers | persona names | `nusrat()`, `jashimWithBullet()` |

Do not abbreviate: write `ride`, not `rr`, and `passenger`, not `pax`. The one exception is the SRS module prefix used inside requirement IDs.

## 6. Constants and business rules

- Every number or string that encodes a business rule is a named constant in `apps/api/src/config/rules.ts`. It is never written inline.
- Rule values that an operator may tune are read from environment variables, with the SRS default as a fallback.
- Environment and security settings (ports, URLs, secrets) live in `apps/api/src/config/env.ts`. They are validated once at start-up, so a missing setting fails loudly.

## 7. Comments and file headers

- Every file starts with a 1–3 line header saying what it does, and which SRS IDs it implements if any.
- Comments explain **why**, not what. Cite the rule: `// BR-07: a fee applies only after the driver has arrived.`
- Do not comment out code. Delete it; git keeps the history.

## 8. Types and errors

- TypeScript `strict` everywhere. `any` is not allowed. Exported API functions declare their return type.
- Relative imports include the `.ts` extension (`import { createApp } from './app.ts'`), so the path you read is the file that exists. The compiler rewrites it to `.js` in the build.
- Errors are thrown as the named classes in `apps/api/src/domain/errors.ts`, each with a code from SRS §8.2 and a human message, for example "Bullet has no free seat". Never throw plain strings.

## 9. Tests

- Tests read like examples from the SRS. Name them as sentences and use the reference personas: `it("rejects Shirin when Bullet's last seat is already taken")`.
- Keep three visible parts in each test: arrange (set up personas and state), act (one call), assert (the expected outcome).
- Integration tests run against a real PostgreSQL test database (ADR-0011). Do not mock the database for behaviour that depends on locks or constraints.
- Run all tests with one command: `npm test`.

## 10. How to change things

| I want to… | Do this |
|---|---|
| Change the pool discount | Set `FARE_POOL_DISCOUNT_BPS` in `.env` (for example `2500` = 25 %), restart the API, and run `npm test`. The tests keep using the SRS default rates, which are pinned in `apps/api/vitest.config.ts`. If the default itself changes, update `config/rules.ts`, the pinned values, and the worked examples in SRS §6.4 together. |
| Change the base fare or the price per km | Same as the pool discount, with `FARE_BASE_PAISA` or `FARE_PER_KM_PAISA`. The formula itself is in `apps/api/src/domain/fare.ts`. |
| Add a new API endpoint | Copy an existing module's four files, rename them, register the router in `apps/api/src/app.ts`, and add a test in `apps/api/test/`. |
| Add a new business rule | Add its SRS ID and text to `docs/SRS.md` and the tracker first. Put the logic in `domain/` or a service, cite the ID in a comment, and add a test named after the rule. |
| Add a new error | Add the code to `ErrorCode` in `domain/errors.ts` and to SRS §8.2. |
| Change which zones count as neighbours for pooling | Edit `ADJACENT_PAIRS` in `apps/api/prisma/seed-data/zones.ts` (each pair once), run `npm run db:seed`, restart the API (zones are cached in memory), and update SRS §13.3. |
| Change how late a request may still join a pool | Set `POOL_JOIN_WINDOW_MINUTES` in `.env`. |
| Change the cancellation fee or the no-show wait | Set `CANCELLATION_FEE_PAISA` (for example `3000` = ৳30) or `NO_SHOW_WAIT_MINUTES` in `.env`, restart the API, and update BR-07 in the SRS. Fees already charged keep their amount. |
| Change the top-up limits | Edit `TOP_UP_MIN_PAISA` and `TOP_UP_MAX_PAISA` in `packages/shared/src/wallet.ts` (the API and the web form both use them), then update BR-17 in the SRS. |
| Move money in or out of a wallet | Use the functions in `apps/api/src/modules/wallet/wallet.service.ts` only. They lock the wallet and write the ledger entry in the same transaction, so the balance always equals the ledger. Never update `wallets.balance_paisa` directly. |
| Allow a new status change | Add it to `RIDE_TRANSITIONS` or `POOL_TRANSITIONS` in `packages/shared/src/transitions.ts`, add it to SRS §5 and to the expected list in `apps/api/test/domain/state-machine.test.ts`, then write the service command that makes the change (compare-and-set plus `recordTransition`). |
| Change how long a request waits before expiring, or how often expiry runs | `REQUEST_EXPIRY_MINUTES` in `.env`; `EXPIRY_SWEEP_INTERVAL_SECONDS` in `apps/api/src/config/rules.ts`. |

## 11. Tooling notes

- **Formatting:** Prettier formats code files (`npm run format`). Markdown documents are formatted by hand.
- **Linting:** ESLint 9 is used because the Next.js lint plugins (React, import, jsx-a11y) do not yet support ESLint 10.
- **Checks before every commit:**
  ```bash
  npm run lint && npm run typecheck && npm test
  ```
