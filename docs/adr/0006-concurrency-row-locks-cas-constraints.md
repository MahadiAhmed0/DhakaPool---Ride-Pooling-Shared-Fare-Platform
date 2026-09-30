# ADR-0006: Concurrency — row locks + compare-and-set + DB constraints; in-process expiry

- **Status:** Accepted · 2026-09-25 (proposed 2026-09-24; accepted once implemented and verified by the test suite)
- **Deciders:** Golam Mahadi Ahmed
- **Related:** NFR-CON-01…06, NFR-REL-04, FR-POOL-02/09, PRD §12, [Architecture §6.2–6.3, §7](../ARCHITECTURE.md#7-consistency--concurrency-strategy-nfr-con-0106-adr-0006)

## Context

PRD §12: *"Bullet has 1 seat left. Nusrat and Shirin both try to claim it at nearly the same instant, and both initially see one seat available."* A naive read-check-write lets both succeed. The same class of race appears in several places:
- two drivers accepting the same request;
- a passenger cancelling while the driver accepts;
- a double-submitted request;
- two wallet debits.

The MVP runs on a single PostgreSQL instance and one API instance, but it must be correct under concurrent HTTP requests.

## Options considered

| Option | Pros | Cons |
|---|---|---|
| **A. Pessimistic row locks (`FOR UPDATE`) on driver and pool rows + compare-and-set on status + CHECK / partial unique constraints** | Serializes exactly the contended resource (one Tesla). No retry loops. The decision logic can read many rows safely after taking the lock. Deterministic and reproducible in tests. | Lock ordering discipline is needed to avoid deadlocks. Holding locks across slow work would hurt, so none is done. |
| B. Optimistic concurrency (`version` column, retry on conflict) | No blocking | Hot resource (a pool with a last seat) means frequent conflicts and retries. More complex client and server logic. |
| C. SERIALIZABLE isolation for everything | Theoretically simplest reasoning | Serialization failures must be retried everywhere, and they are harder to reason about and to test deterministically |
| D. Single atomic `UPDATE pools SET occupied_seats = occupied_seats + n WHERE … AND occupied_seats + n <= capacity` only | One statement, no explicit lock | The compatibility check needs member destinations read in the same critical section, so it doesn't cover the whole decision |
| E. Application mutex or Redis lock | Familiar | Wrong layer, breaks with more than one API instance, and adds Redis (DC-05) |

## Decision

**Option A, in four layers:**

1. **Serialize.** Inside one transaction, lock in a fixed global order: **`driver_profiles` → `pools` → `ride_requests` (via CAS) → `wallets`**. Every command that touches more than one of these follows the order, which prevents deadlocks.
2. **Compare-and-set** every transition: `UPDATE … WHERE id = $1 AND status = $expected` (plus `expires_at > now()` for accepts). Zero affected rows → 409 `INVALID_STATE_TRANSITION`, and the whole transaction rolls back.
3. **Constraints as the backstop:**
   - `pools_occupied_seats_check`
   - `wallets_balance_check`
   - `ride_requests_one_active_per_passenger`
   - `pools_one_active_per_driver`
   - `pool_members_one_active_membership`

   Their errors are mapped to domain codes.
4. **Atomic side effects:** membership, seat counter, fares, payment, ledger and audit are written in the same transaction.

**Isolation and timeouts:**
- Isolation is READ COMMITTED (the default). After a lock wait, each statement sees the newest committed data.
- The Prisma interactive-transaction `timeout` is 5000 ms.
- `SET LOCAL lock_timeout = '3s'` makes lock waits fail fast as 503.

**Expiry without a queue:**
- `expires_at` is part of the accept CAS, so correctness never depends on a job.
- A 60-second `setInterval` sweeper, started in `server.ts` and not in tests, marks stale rides EXPIRED with SYSTEM audit rows.
- Creating a new request first expires the passenger's own stale rides in the same transaction.

## Consequences

- **+** The Nusrat and Shirin race has a deterministic outcome: one 200 and one 409 `CAPACITY_EXCEEDED`. It is provable by a repeated parallel test (TC-06).
- **+** No extra infrastructure.
- **−** All writes for one Tesla are serialized. That is fine: a driver produces a few commands per minute.
- **−** Developers must follow the lock order. Mitigation: only `db/lock.ts` exposes lock helpers, and there is a code-review checklist item.
- **−** With N API replicas there are N sweepers. They are idempotent, so this is correct but redundant.

## Revisit when (scale path, also for the README bonus)

- Contention moves from "one Tesla" to "one hot zone" with thousands of drivers → partition matching by zone or cell with a single writer per partition (queue or actor).
- Clients retry over unreliable networks → an `Idempotency-Key` on every command (NFR-CON-06).
- More than one API replica → move the sweeper to a scheduled job, and the rate limiter to a shared store.
