# ADR-0007: REST/JSON with explicit command endpoints for state transitions

- **Status:** Accepted · 2026-09-25 (proposed 2026-09-24; accepted once implemented and verified by the test suite)
- **Deciders:** Golam Mahadi Ahmed
- **Related:** BR-06, SRS D-10, SRS §8.2, PRD §6 (API style must be justified)

## Context

The API serves one first-party web client. Most operations are lifecycle **commands** with guards (arrive, start, drop off, cancel), not free-form edits. Each command has its own actor, preconditions and side effects (SRS §5).

## Options considered

| Option | Pros | Cons |
|---|---|---|
| **A. REST resources + action sub-resources** (`POST /api/pools/:id/start`) | Each transition is one endpoint with its own validation, authorization and audit reason. Trivial to test with curl or Supertest. Cache-friendly GETs. | More endpoints than a generic PATCH |
| B. REST with `PATCH /rides/:id { status }` | Fewer endpoints | Encourages "set any status"; guards and side effects become a big switch statement |
| C. GraphQL | Flexible reads for many clients | Schema, resolvers and N+1 handling are overhead for a single client with fixed screens. Mutations would still be commands. |
| D. tRPC | End-to-end types | Couples the web app to the API implementation, and does not expose a conventional, client-agnostic HTTP API |

## Decision

**Option A.**
- **Resources:** `rides`, `pools`, `wallet`, `zones`, `auth`, `driver`.
- **Transitions:** `POST` to a verb sub-resource.
- **Request and response bodies:** JSON, validated by shared Zod schemas.
- **Errors:** the standard error shape from SRS §8.2.
- **Status codes:**
  - 201 on create;
  - 200 on commands (returning the updated resource);
  - 409 for state conflicts;
  - 422 for rule violations.

## Consequences

- **+** The endpoint list is the state machine, which makes it self-documenting in the README API overview.
- **+** An unlisted transition simply has no endpoint.
- **−** No automatic schema introspection. The README API table plus the shared Zod types serve as the contract; OpenAPI generation is a next improvement.

## Revisit when

Several heterogeneous clients (mobile, partner APIs) need different read shapes → consider GraphQL for reads. Commands stay commands.
