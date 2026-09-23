# Architecture Decision Records

Each ADR records one significant technical decision: its context, the options considered, the choice, its consequences, and **what would make us switch**. PRD §7 asks for exactly this reasoning, and the README's "Tech stack & justification" table summarises these files.

**Status values:**
- **Proposed:** drafted, awaiting review.
- **Accepted:** agreed.
- **Superseded by ADR-NNNN:** replaced by a later decision.

ADRs are never edited after acceptance except to change their status. A changed decision gets a new ADR.

| ADR | Decision | Status | SRS links |
|---|---|---|---|
| [0001](0001-modular-monolith.md) | Modular monolith: Next.js web + one Express API + PostgreSQL | Proposed | DC-05, DR-14 |
| [0002](0002-postgresql.md) | PostgreSQL as the database | Proposed | DC-03, NFR-CON-01…05 |
| [0003](0003-express-typescript.md) | Express + TypeScript for the API | Accepted | DC-02 |
| [0004](0004-prisma-with-hand-written-integrity-sql.md) | Prisma ORM, with integrity constraints in hand-written SQL migrations | Accepted | NFR-CON-04, NFR-POR-03 |
| [0005](0005-db-sessions-and-same-origin-proxy.md) | Server-side DB sessions in an httpOnly cookie, behind a same-origin Next.js proxy | Accepted | FR-AUTH-02/03, NFR-SEC-06 |
| [0006](0006-concurrency-row-locks-cas-constraints.md) | Concurrency: row locks + compare-and-set + DB constraints; in-process expiry | Proposed | NFR-CON-01…03, NFR-REL-04 |
| [0007](0007-rest-with-command-endpoints.md) | REST/JSON with explicit command endpoints for state transitions | Proposed | BR-06, SRS §8.2 |
| [0008](0008-npm-workspaces-monorepo.md) | npm-workspaces monorepo with a shared Zod package | Proposed | NFR-MNT-01/03 |
| [0009](0009-docker-first-deployment.md) | Docker Compose first; later Vercel + Railway + Supabase (free tiers) | Accepted | NFR-POR-01/04, DC-04 |
| [0010](0010-polling-for-status-updates.md) | Client polling for live status | Proposed | FR-PAX-07, NFR-PERF-03 |
| [0011](0011-testing-vitest-supertest-real-postgres.md) | Vitest + Supertest against a real PostgreSQL | Proposed | DR-10, NFR-MNT-04 |
| [0012](0012-frontend-nextjs-tanstack-query-tailwind.md) | Next.js App Router + TanStack Query + Tailwind CSS | Proposed | DC-01, NFR-USA-* |
