# ADR-0004: Prisma ORM, with integrity constraints in hand-written SQL migrations

- **Status:** Accepted · 2026-09-24 (chosen by the product owner/developer)
- **Deciders:** Golam Mahadi Ahmed
- **Related:** NFR-CON-02/04, NFR-POR-03, NFR-SEC-08, [ERD §4](../ERD.md#4-integrity-constraints--where-each-one-lives)

## Context

We need type-safe data access, versioned migrations and a seed script. The integrity design (ADR-0006) also needs four things:
- `SELECT … FOR UPDATE` row locks;
- conditional ("compare-and-set") updates;
- `CHECK` constraints;
- partial unique indexes and an append-only trigger.

## Options considered

| Option | Pros | Cons |
|---|---|---|
| **A. Prisma** | Excellent TypeScript types and DX. `prisma migrate` for versioned migrations. `prisma db seed`. Interactive transactions (`$transaction(async tx => …)`). `updateMany` returns a count, which gives compare-and-set natively. Very widely used. | No row-lock API. CHECK, partial unique indexes and triggers can't be declared in `schema.prisma`. `BigInt` maps to JS `bigint`. |
| B. Drizzle ORM | SQL-shaped, supports `.for('update')`, CHECK and partial indexes in its schema | A younger ecosystem, less familiar to the developer |
| C. Knex / raw SQL | Full SQL control | No generated types for models, more boilerplate |
| D. TypeORM | Decorator entities, locking API | Many known pitfalls and more implicit behaviour |

## Decision

**Prisma.** The gaps are closed explicitly, not hidden:

1. **Row locks:** `` tx.$queryRaw`SELECT … FROM pools WHERE id = ${id} FOR UPDATE` `` inside `prisma.$transaction(async (tx) => …, { timeout: 5000 })`, wrapped in `db/lock.ts` helpers (`lockDriver`, `lockPool`, `lockWallet`). Always parameterized; `$queryRawUnsafe` is never used.
2. **Compare-and-set:** `tx.rideRequest.updateMany({ where: { id, status: 'REQUESTED' }, data: { status: 'MATCHED' } })`, then assert `count === 1`, otherwise throw a 409.
3. **CHECK constraints, partial unique indexes and triggers:** generate the migration with `prisma migrate dev --create-only`, append the SQL from [ERD §4.2](../ERD.md#42-hand-written-sql-migration-_integrity_constraintsmigrationsql), and commit it. `prisma migrate deploy` then applies it like any other migration.
4. **BigInt money:** repositories convert `bigint` to `number` at the boundary (amounts are far below 2^53), so JSON serialization and the rest of the code stay simple.
5. **Constraint errors:** the error mapper translates Postgres `23514` and `23505` codes to domain errors by constraint name (ARCHITECTURE §7.2).

## Consequences

- **+** Type-safe queries for about 95 % of the code, and visible raw SQL exactly where the concurrency guarantees are implemented.
- **−** `schema.prisma` is not the whole truth about constraints. Mitigations:
  - the ERD lists every constraint and where it lives;
  - a comment block in `schema.prisma` points to the integrity migration;
  - integration tests prove each constraint fires.
- **−** `prisma migrate dev` on a changed schema must not drop the hand-written objects. Keep them in their own migration and review generated diffs before committing.

## Revisit when

Most queries end up needing raw SQL, or Prisma adds native support for CHECK and partial indexes, in which case we would move the SQL into the schema.
