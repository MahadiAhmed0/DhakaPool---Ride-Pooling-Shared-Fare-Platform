# ADR-0002: PostgreSQL as the database

- **Status:** Accepted · 2026-09-25 (proposed 2026-09-24; accepted once implemented and verified by the test suite)
- **Deciders:** Golam Mahadi Ahmed
- **Related:** DC-03, NFR-CON-01…05, SRS D-13, [ERD](../ERD.md)

## Context

The core risks are data-integrity risks: capacity can never be exceeded, a passenger has one active ride, a driver has one active pool, a wallet can never go negative, and the audit trail is immutable. These need transactions, row-level locks and constraints the database itself enforces. PRD §6 recommends a relational database.

## Options considered

| Option | Pros | Cons |
|---|---|---|
| **A. PostgreSQL 16** | `CHECK` constraints, **partial unique indexes** ("one *active* ride per passenger"), `SELECT … FOR UPDATE`, transactional DDL, native enums, triggers. Free managed tiers exist (Supabase, Neon). | Heavier than SQLite for local runs, but Docker hides that |
| B. MySQL 8 | Mature, widely hosted | No partial indexes (they need generated-column workarounds). CHECK constraints only enforced since 8.0.16. Weaker DDL transactions. |
| C. SQLite | Zero setup | Database-level write lock (no row locks), so the concurrency design and tests would be unrealistic. Poor fit for a hosted multi-user app. |
| D. MongoDB | Flexible documents | Multi-document invariants such as capacity plus membership plus ledger need transactions and application-level constraints, and the PRD leans relational |

## Decision

**PostgreSQL 16.** Use the `postgres:16-alpine` image locally, and Supabase Postgres later (ADR-0009).

## Consequences

- **+** Every business invariant in SRS §7 has a database-level backstop ([ERD §4](../ERD.md#4-integrity-constraints--where-each-one-lives)).
- **+** Row locks make the last-seat race straightforward to serialize (ADR-0006).
- **−** Some of these features are outside Prisma's schema language, so they need hand-written SQL (ADR-0004).

## Revisit when

Practically never for this domain. At very large scale, the question becomes *how* to partition PostgreSQL (by city or zone) or add read replicas, not whether to replace it.
