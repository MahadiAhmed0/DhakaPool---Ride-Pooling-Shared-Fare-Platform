# ADR-0010: Client polling for live status

- **Status:** Proposed · 2026-09-24
- **Deciders:** Golam Mahadi Ahmed
- **Related:** FR-PAX-07, NFR-PERF-03, SRS D-11 / A-11, DC-05

## Context

Passengers must see status changes (matched, arrived, started) without reloading, and drivers must see new requests. At MVP scale this means a handful of concurrent users. PRD §9 discourages adding infrastructure without a reason.

## Options considered

| Option | Pros | Cons |
|---|---|---|
| **A. Polling every 4 s via TanStack Query `refetchInterval`** | Zero server infrastructure. Works through every proxy and free host. Trivial to reason about. Stops automatically when the tab is hidden or the ride is terminal. | Up to about 4 s of latency, and wasted requests when nothing changes |
| B. Server-Sent Events | Real push, simple protocol | Long-lived connections through the Next.js proxy and free hosts (idle timeouts, sleeping instances). Needs fan-out when there are several API instances. |
| C. WebSockets (Socket.IO) | Bidirectional, low latency | A connection-state server, sticky sessions or an adapter (Redis) at scale. Overkill here. |

## Decision

**Option A.**
- **Passenger:** the active-ride view polls `GET /api/rides?scope=active` every 4 s while the ride is non-terminal.
- **Driver:** the requests feed and the active pool poll `/api/driver/requests` and `/api/driver/pools?scope=active` every 4 s while the driver is online.
- **When the tab is hidden:** no polling.
- **After a mutation:** the related queries are invalidated, so the actor sees the change immediately.

## Consequences

- **+** Meets FR-PAX-07 (≤ 5 s) with no new components.
- **−** Roughly 15 requests per minute per active user. Fine at MVP scale, and the endpoints are indexed (NFR-PERF-02).

## Revisit when

Concurrent active users reach the thousands, or sub-second updates matter. Then move to SSE or WebSockets fed by DB change events (LISTEN/NOTIFY, then a message bus at scale).
