# ADR-0003: Express + TypeScript for the API

- **Status:** Accepted · 2026-09-24 (chosen by the product owner/developer)
- **Deciders:** Golam Mahadi Ahmed
- **Related:** DC-02, PRD §6–8, [Architecture §5](../ARCHITECTURE.md#5-api-internal-structure)

## Context

The backend must be Node.js, and PRD §7 requires the framework choice to be justified. The code must be easy to trace, debug and modify (PRD §8). The API is small (about 25 endpoints) but rule-heavy.

## Options considered

| Option | Pros | Cons |
|---|---|---|
| **A. Express 5 + TypeScript** | The most widely known Node framework, with a huge ecosystem (helmet, express-rate-limit, pino-http). No hidden control flow: middleware runs in declaration order. Express 5 forwards rejected async handlers to the error middleware. | No built-in structure or validation; layering must be imposed by the project. |
| B. NestJS | Modules, DI, guards, pipes and interceptors out of the box, which map neatly onto role guards and validation | Decorators and DI add indirection that obscures control flow. More boilerplate than this MVP needs. |
| C. Fastify | Fast, with built-in JSON-schema validation and pino | A smaller plugin ecosystem, and the encapsulation model is less familiar |

## Decision

**Express 5 with TypeScript (strict mode).** Structure is imposed explicitly:
- a request pipeline: request-id → logger → helmet → session → role guard → Zod validation → controller;
- per-module layering: routes → controller → service → repository;
- a single error-handling middleware;
- `app.ts` exports the app, so Supertest can use it without a network port.

## Consequences

- **+** Easy to read top to bottom, and easy to debug with plain stack traces.
- **+** The layering is explicit and documented, so code can be reviewed against the architecture.
- **−** Discipline is required. Mitigations: ESLint import boundaries between layers, and code review against [Architecture §5.2](../ARCHITECTURE.md#52-layer-rules).

## Revisit when

- The team grows and needs framework-enforced structure → NestJS.
- Measured throughput becomes a bottleneck at the HTTP layer → Fastify.

Services and repositories contain no Express types, so either move keeps the domain code unchanged.
