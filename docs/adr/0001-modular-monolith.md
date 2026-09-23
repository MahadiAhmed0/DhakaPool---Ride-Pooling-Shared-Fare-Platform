# ADR-0001: Modular monolith — Next.js web + one Express API + PostgreSQL

- **Status:** Proposed · 2026-09-24
- **Deciders:** Golam Mahadi Ahmed
- **Related:** DC-05, DR-14, PRD §9, [Architecture §2](../ARCHITECTURE.md#2-architectural-style)

## Context

The MVP has three actors (passenger, driver, pool) and a handful of rules that must hold together atomically. When a seat is claimed, the membership, the seat counter, the fare, the payment, the ledger and the audit row must all change in **one** transaction. PRD §9 explicitly discourages microservices, Kafka, Kubernetes, Redis and queues unless there is a reason for them. The whole system must run locally with a single `docker compose up`.

## Options considered

| Option | Pros | Cons |
|---|---|---|
| **A. Modular monolith: web + API + DB** | One transaction boundary for every rule. Simple to run, debug and operate. Matches the PRD's minimum diagram. | One deployable API. Modules could become coupled without discipline. |
| B. Next.js only (API routes / server actions) + DB | Fewest moving parts | The PRD's diagram expects a separate Node.js API. Business logic gets mixed into UI framework code, and it is harder to test the API in isolation. |
| C. Microservices (rides, pools, payments) + message broker | Independent scaling | Distributed transactions for seat claims, far more infrastructure, and exactly what the PRD warns against |

## Decision

**Option A.**
- The API is internally split into domain modules (`auth`, `zones`, `fares`, `rides`, `drivers`, `pools`, `wallet`, `audit`), each layered routes → controller → service → repository, plus a pure `domain/` layer.
- Modules call each other's services, never each other's repositories.

## Consequences

- **+** Every invariant is enforced inside one PostgreSQL transaction, with no sagas or outbox.
- **+** Three containers, and one log stream per container.
- **−** The API scales only as a whole. That is acceptable at MVP load; see ADR-0006 for the scale path.
- **−** Module boundaries rely on convention. Mitigation: each module exports only its service, and repositories aren't exported.

## Revisit when

A single module (most likely matching or dispatch) needs independent scaling, or a different consistency model, at a scale far beyond the MVP. It would then be extracted behind its existing service interface.
