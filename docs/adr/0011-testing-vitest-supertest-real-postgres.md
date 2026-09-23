# ADR-0011: Vitest + Supertest against a real PostgreSQL

- **Status:** Proposed · 2026-09-24
- **Deciders:** Golam Mahadi Ahmed
- **Related:** DR-10, NFR-MNT-02/04, [Architecture §13](../ARCHITECTURE.md#13-testing-architecture-dr-10-nfr-mnt-04-adr-0011), Tracker *Test_Cases* TC-01…TC-46

## Context

PRD §12 asks for meaningful tests of risky behaviour:
- capacity;
- invalid transitions;
- pooled fares;
- cross-user modification;
- cancellation rules;
- **concurrent** capacity corruption.

Most of these are enforced by database locks and constraints, so mocks would test nothing real.

## Options considered

| Option | Pros | Cons |
|---|---|---|
| **A. Vitest (unit + integration) + Supertest, against a real Postgres test database** | Fast, TypeScript-native, Jest-compatible API. Supertest drives the real Express app in-process. A real Postgres exercises locks, CHECKs and partial indexes. | Integration tests need a running DB (provided by Docker Compose) |
| B. Jest | The most familiar | Slower TypeScript/ESM setup, and no advantage here |
| C. Mocked repositories / SQLite in-memory | No DB needed | Cannot reproduce row locks or Postgres constraints, so the concurrency tests would be fake |
| D. Testcontainers | A fresh DB per run automatically | Needs the Docker socket inside CI or containers. Compose's `dhakapool_test` DB is simpler. |

## Decision

**Option A.**
- **Unit tests** (`test/unit`) cover pure `domain/*`: fare examples, the matching table and the transition matrix.
- **Integration tests** (`test/integration`) cover HTTP → DB behaviour, and each suite truncates the tables.
- **Concurrency tests** (`test/concurrency`) fire parallel requests with `Promise.all`, repeated at least 20 times.
- **Factories** create the reference personas (`nusrat()`, `jashimWithBullet()`), so tests use the same domain language as the requirements.
- **One command:** `npm test` locally (needs `TEST_DATABASE_URL`), or `docker compose run --rm api npm test`.

## Consequences

- **+** Tests verify the real guarantees (row locks, constraints, transactions) instead of mocked behaviour.
- **−** Integration tests are slower than pure unit tests, taking seconds rather than milliseconds. Acceptable.
- **−** Tests run serially at the file level (`fileParallelism: false`) so suites don't truncate each other's data.

## Revisit when

The suite grows past a few minutes → a schema-per-worker or Testcontainers per worker, run in parallel.
