# ADR-0008: npm-workspaces monorepo with a shared Zod package

- **Status:** Accepted · 2026-09-25 (proposed 2026-09-24; accepted once implemented and verified by the test suite)
- **Deciders:** Golam Mahadi Ahmed
- **Related:** NFR-MNT-01/03, NFR-SEC-04, [Architecture §11](../ARCHITECTURE.md#11-repository-layout-npm-workspaces-monorepo-adr-0008)

## Context

The web app and the API must agree on:
- request and response shapes;
- enum values (ride and pool statuses);
- the transition table, which decides which buttons the UI shows (NFR-USA-03);
- money formatting.

Duplicating these invites drift. The PRD also asks for one repository with a meaningful history.

## Options considered

| Option | Pros | Cons |
|---|---|---|
| **A. npm workspaces: `apps/web`, `apps/api`, `packages/shared`** | Built into npm, no extra tool. One lockfile and one install. `shared` is imported as a normal package. | Docker builds must copy the workspace root plus the needed packages |
| B. Turborepo / Nx | Task caching and orchestration | An extra tool to learn and maintain, with little benefit for 3 packages |
| C. Two separate repositories | Clear separation | Shared types must be published or duplicated, and branching / release history is split |
| D. One repo, no shared package | Simple | Schemas and enums duplicated in web and API |

## Decision

**Option A.**
- **`packages/shared` exports:**
  - Zod schemas for every request body and query;
  - enums;
  - the transition tables;
  - `formatPaisa()`;
  - DTO types.
- **It must not contain:** DB code, Prisma types or server-only logic.
- **Tooling:** TypeScript project references, one ESLint and Prettier config at the root, and root scripts `npm run dev`, `npm test` and `npm run lint`.

## Consequences

- **+** A schema change fails type-checking in both apps at once.
- **+** One `npm ci` sets up everything.
- **−** Dockerfiles need a workspace-aware build (copy the root `package.json`, the lockfile and the relevant workspaces, then `npm ci -w <app>`).

## Revisit when

Build times grow large enough to need caching → add Turborepo on top without restructuring.
