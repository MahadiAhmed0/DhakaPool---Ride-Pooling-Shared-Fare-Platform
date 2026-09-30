# Dhaka Tesla Pool: Ride Pooling & Shared Fares

A full-stack MVP for sharing Dhaka's three-wheeled Teslas. Passengers request a ride between city zones and may share it; drivers accept compatible requests into one trip without ever exceeding their Tesla's seats; every passenger pays an individual, hand-checkable fare. Built with Next.js, an Express + TypeScript API and PostgreSQL, and run with one Docker Compose command.

| | |
|---|---|
| **Live demo** | **<https://dhakapool-web.vercel.app/>** · sign in with the [demo accounts](#demo-accounts) |
| **Demo video** | [Watch the walkthrough](https://drive.google.com/drive/folders/17gr208ltawDP9jgigAe7KKQ-HSRXLY1L?usp=sharing) |
| **Deployment** | Vercel · Railway · Supabase ([how it is set up](#deployment)) |
| **Requirements** | [SRS](docs/SRS.md) · [traceability workbook](docs/DhakaPool_SRS_Tracker.xlsx) |
| **Design** | [Architecture](docs/ARCHITECTURE.md) · [ERD](docs/ERD.md) · [ADRs](docs/adr/README.md) · [Coding conventions](docs/CODING_CONVENTIONS.md) · [Scaling notes](docs/SCALING.md) |

---

## Contents

1. [The problem](#the-problem)
2. [Features](#features)
3. [Screenshots](#screenshots)
4. [Quick start (Docker)](#quick-start-docker)
5. [Demo accounts](#demo-accounts)
6. [Architecture](#architecture)
7. [Data model](#data-model)
8. [Tech stack and why](#tech-stack-and-why)
9. [Project structure](#project-structure)
10. [Local development](#local-development)
11. [Environment variables](#environment-variables)
12. [Tests](#tests)
13. [API overview](#api-overview)
14. [Business rules](#business-rules)
15. [Concurrency: the last-seat problem](#concurrency-the-last-seat-problem)
16. [Scaling to 1M passengers and 100k drivers](#scaling-to-1m-passengers-and-100k-drivers)
17. [Key decisions and trade-offs](#key-decisions-and-trade-offs)
18. [AI usage](#ai-usage)
19. [Known limitations](#known-limitations)
20. [Next improvements](#next-improvements)
21. [Deployment](#deployment)

---

## The problem

At rush hour in Banani, Nusrat is going to Mohakhali and Rafiq to Gulshan 1. Both wait for a Tesla, and each pays for a whole vehicle that could have carried them together. Jashim's Tesla, **Bullet**, has three seats.

Dhaka Tesla Pool lets them share Bullet safely:

- **Pooling is explicit.** A passenger opts in; the driver accepts each compatible request into the trip.
- **Capacity is a hard limit.** Bullet can never carry more than three seats, even when Nusrat and Shirin claim the last seat at the same instant.
- **Fares are individual and understandable.** Each passenger pays for their own distance, with a pool discount only when the Tesla really was shared.
- **The lifecycle is clear.** Every ride and every trip has a documented state machine, and every change is recorded.

## Features

**Passenger (Nusrat, Rafiq, Shirin)**
- Sign up and sign in; optional self-declared gender, used only for the same-gender option.
- Request a ride: pickup and destination zone, seats, share or ride alone, same-gender ride, TeslaPay or cash.
- See the solo and shared price before requesting.
- Follow the ride live: *Finding a Tesla → Driver on the way → Driver is here → On the way → Completed*, with the driver, Tesla, plate and co-rider count (never co-riders' names).
- Cancel while allowed, with the cost stated before confirming (free before the driver arrives, ৳20 after).
- Ride history with a full timeline and fare breakdown.
- TeslaPay wallet: balance, simulated top-up (৳50–৳5,000) and statement.

**Driver (Jashim with Bullet)**
- Go online in a zone or offline; locked while a trip is under way.
- See only the waiting requests that fit the Tesla and can join the current trip, and accept them.
- Manage the trip: arrived at pickup, start (fixes every fare), drop off each passenger in any order, mark a no-show, record cash collected, cancel before the start.
- Trip history with each passenger's fare and payment.

**Pool and fares**
- Several requests share one Tesla; occupied seats never exceed capacity.
- Each passenger gets an individual fare; the pool discount applies only if two or more passengers actually rode together.
- Optional women-only / men-only trips.
- Every status change is written to an append-only audit trail.

## Screenshots

Captured from the running stack with the seeded personas: Jashim driving **Bullet**, with Nusrat and Rafiq sharing it from Banani.

**Signing in**

| | |
|---|---|
| ![Sign in](docs/screenshots/sign-in.png) | ![Sign up](docs/screenshots/sign-up.png) |
| Sign in with an e-mail or a phone number. Outside production the page also lists the demo personas | Sign up, with gender optional and self-declared |

**Passenger**

| | |
|---|---|
| ![Requesting a ride](docs/screenshots/request-a-ride.png) | ![Waiting to be matched](docs/screenshots/finding-a-tesla.png) |
| Request a ride: zones, seats, sharing, same-gender and payment, with both prices shown before committing | Waiting for a Tesla, with the request's own expiry in view |
| ![Following the ride](docs/screenshots/ride-tracker.png) | ![Ride history](docs/screenshots/ride-history.png) |
| Following the ride: driver, Tesla, plate and co-rider count, never a co-rider's name | History, newest first, a page at a time |
| ![Ride detail with fare breakdown](docs/screenshots/ride-detail.png) | ![TeslaPay wallet](docs/screenshots/wallet.png) |
| The fare, checkable by hand: ৳30 base plus ৳45 distance less the ৳9 shared-ride discount, with the full timeline | TeslaPay: balance, simulated top-up and the statement behind it |

**Driver**

| | |
|---|---|
| ![Driver dashboard](docs/screenshots/driver-dashboard.png) | ![Waiting requests](docs/screenshots/driver-requests.png) |
| Bullet's card with the online toggle and zone, locked while a trip is under way | Only the requests that fit Bullet and can join the current trip |
| ![Active trip](docs/screenshots/driver-pool.png) | ![Trip history](docs/screenshots/driver-history.png) |
| The trip: two of three seats taken, one row per passenger, and only the actions the state machine allows | Past trips with each passenger's fare and payment |

**At 390 px**

| | |
|---|---|
| ![Ride tracking on a phone](docs/screenshots/mobile-ride-tracker.png) | ![Trip management on a phone](docs/screenshots/mobile-driver-pool.png) |
| Following a ride | Managing a trip |

## Quick start (Docker)

Prerequisites: **Docker** with Compose v2. Nothing else is needed.

```bash
git clone <this repository>
cd <repository folder>
cp .env.example .env
docker compose up --build
```

| Service | URL |
|---|---|
| Web app | http://localhost:3000 |
| API health | http://localhost:4000/health → `{"status":"ok","db":"up"}` |

On start the API applies the database migrations and seeds the Dhaka zones and the demo personas. Both steps are idempotent, so restarting is safe. `.env` is optional for Docker: without it, Compose uses the same defaults as `.env.example`.

If port 5432 is already taken on your machine, set `DB_PORT` in `.env` (for example `5433`).

## Demo accounts

Every seeded persona uses the demo password **`TeslaPool#2026`** (set by `SEED_DEMO_PASSWORD`; demo data only, not a secret).

| Persona | Sign in with | Role | Seeded state |
|---|---|---|---|
| Nusrat | `nusrat@dhakapool.test` | Passenger (female) | TeslaPay ৳500.00 |
| Rafiq | `rafiq@dhakapool.test` | Passenger (male) | TeslaPay ৳0.00, pays cash |
| Shirin | `shirin@dhakapool.test` | Passenger (female) | TeslaPay ৳200.00 |
| Jashim | `jashim@dhakapool.test` | Driver | **Bullet**, 3 seats, `DHAKA-TESLA-11`, offline |
| Kamal | `kamal@dhakapool.test` | Driver | **Toofan**, 3 seats, `DHAKA-TESLA-22`, offline |

The seed also creates the ten Dhaka zones the app offers, with the road distances that drive every fare. Distances here are from Banani, the pickup in the tour below; the price is the solo fare for one seat, ৳30 base plus ৳15 per kilometre.

| Code | Zone | From Banani | Solo fare | Shares a boundary with |
|---|---|---|---|---|
| `BAN` | Banani | pickup | | GL1, GL2, MHK |
| `GL1` | Gulshan 1 | 2.5 km | ৳67.50 | BAN, GL2, MHK, TEJ |
| `GL2` | Gulshan 2 | 2.0 km | ৳60.00 | BAN, GL1, BSH |
| `MHK` | Mohakhali | 3.0 km | ৳75.00 | BAN, GL1, TEJ |
| `TEJ` | Tejgaon | 5.0 km | ৳105.00 | GL1, MHK, FRM |
| `FRM` | Farmgate | 7.0 km | ৳135.00 | TEJ, DHN, MIR |
| `DHN` | Dhanmondi | 10.0 km | ৳180.00 | FRM |
| `MIR` | Mirpur | 8.5 km | ৳157.50 | FRM |
| `UTR` | Uttara | 11.0 km | ৳195.00 | BSH |
| `BSH` | Bashundhara | 5.5 km | ৳112.50 | GL2, UTR |

Two passengers may share a Tesla only when their destinations are the same or share a boundary (BR-02), which is why a Banani → Uttara request cannot join a trip heading to Mohakhali. The seed is idempotent, keyed on e-mail, zone code and plate, so running it again changes nothing. [ERD §6](docs/ERD.md#6-seed-data-reference-personas-dr-15) lists every seeded row, and [SRS §13.3](docs/SRS.md) holds the full distance matrix.

**A two-minute tour (scenario E1):** sign in as Jashim in one browser and go online in Banani. In another browser (or a private window), sign in as Nusrat and request Banani → Mohakhali, shared, TeslaPay; then as Rafiq request Banani → Gulshan 1, shared, cash. Jashim accepts both, marks *Arrived*, *Start*, and drops them off. Nusrat pays ৳66.00 from TeslaPay and Rafiq ৳60.00 in cash (their solo fares would be ৳75.00 and ৳67.50).

## Architecture

A modular monolith: one Next.js web app, one Express API and one PostgreSQL database ([ADR-0001](docs/adr/0001-modular-monolith.md)). Every rule that matters (capacity, transitions, wallet balance) needs one ACID transaction, so splitting services would add distributed consistency without solving a real problem.

```mermaid
flowchart LR
    B["Browser<br/>(mobile / desktop)"]
    subgraph WEB["web: Next.js App Router"]
        UI["Pages & components<br/>TanStack Query (polling)"]
        PX["/api/* rewrite proxy"]
    end
    subgraph API["api: Express 5 + TypeScript"]
        MW["Middleware<br/>request-id · logger · helmet ·<br/>session auth · role guard · Zod validation · rate limit"]
        MOD["Modules<br/>auth · zones · fares · rides · drivers · pools · wallet · audit"]
        DOM["Pure domain layer<br/>fare · matching · state machine · money"]
        JOB["Request-expiry sweeper (60 s)"]
        PR["Prisma Client"]
    end
    DB[("PostgreSQL 16<br/>constraints · partial unique indexes ·<br/>row locks · append-only audit trigger")]

    B -- "pages + /api/* JSON<br/>(same origin, httpOnly session cookie)" --> WEB
    UI --> PX
    PX -- "HTTP JSON (internal network)" --> MW
    MW --> MOD --> DOM
    MOD --> PR -- "SQL" --> DB
    JOB --> PR
```

- **The browser talks to one origin.** Next.js forwards `/api/*` to the API, so the session cookie stays first-party: no CORS preflights and no `SameSite=None` cookies ([ADR-0005](docs/adr/0005-db-sessions-and-same-origin-proxy.md)).
- **Every API module has the same four layers:** routes → controller → service → repository. Services own the transactions; the domain layer is pure and has no I/O.
- **Live status uses polling** every 4 s while a ride or trip is active, and stops when it ends or the tab is hidden ([ADR-0010](docs/adr/0010-polling-for-status-updates.md)).

Details: [ARCHITECTURE.md](docs/ARCHITECTURE.md), including the request pipeline, key flows and security.

## Data model

Fifteen tables. A **ride request** belongs to one passenger; a **pool** is one Tesla trip; **pool members** join them. Fares, payments and the TeslaPay ledger are separate, immutable records, and `status_history` keeps every transition.

```mermaid
erDiagram
    users ||--o{ sessions : "signs in with"
    users ||--o| driver_profiles : "is a driver"
    users ||--o| wallets : "owns (passenger)"
    users ||--o{ ride_requests : "requests (passenger)"
    driver_profiles ||--|| vehicles : "owns one Tesla"
    driver_profiles ||--o{ pools : "drives"
    vehicles ||--o{ pools : "used for"
    zones ||--o{ zone_distances : "from / to"
    zones ||--o{ zone_adjacency : "neighbours"
    zones ||--o{ ride_requests : "pickup / destination"
    zones ||--o{ pools : "pickup"
    zones |o--o{ driver_profiles : "current zone"
    pools ||--|{ pool_members : "contains"
    ride_requests ||--o{ pool_members : "assigned through"
    ride_requests ||--o{ fares : "charged"
    fares ||--o| payments : "settled by"
    wallets ||--o{ wallet_transactions : "ledger"
    wallet_transactions |o--o| payments : "funds"
    ride_requests |o--o{ wallet_transactions : "relates to"
    users |o--o{ status_history : "acted (actor)"

    users {
        uuid id PK
        varchar full_name
        varchar email UK "stored lower-case"
        varchar phone UK
        varchar password_hash "bcrypt"
        user_role role "PASSENGER or DRIVER"
        gender gender "FEMALE, MALE, PREFER_NOT_TO_SAY"
        timestamptz created_at
        timestamptz updated_at
    }
    sessions {
        uuid id PK
        uuid user_id FK
        char token_hash UK "SHA-256 of cookie token"
        timestamptz expires_at
        timestamptz last_seen_at
        timestamptz revoked_at "null means active"
        timestamptz created_at
    }
    driver_profiles {
        uuid user_id PK, FK
        driver_availability availability "ONLINE or OFFLINE"
        varchar current_zone_code FK "required when ONLINE"
        timestamptz updated_at
    }
    vehicles {
        uuid id PK
        uuid driver_id FK, UK "one Tesla per driver"
        varchar name "Bullet"
        varchar plate UK
        smallint capacity "CHECK 1 to 6"
        timestamptz created_at
    }
    zones {
        varchar code PK "BAN, GL1, MHK ..."
        varchar name
        numeric lat
        numeric lng
    }
    zone_distances {
        varchar from_zone_code PK, FK
        varchar to_zone_code PK, FK
        int distance_m "CHECK > 0"
    }
    zone_adjacency {
        varchar zone_code PK, FK
        varchar adjacent_zone_code PK, FK
    }
    ride_requests {
        uuid id PK
        uuid passenger_id FK
        varchar pickup_zone_code FK
        varchar destination_zone_code FK
        smallint seats "CHECK 1 to 6"
        boolean pool_opt_in
        boolean same_gender_only "requires pool_opt_in"
        payment_method payment_method
        ride_status status
        bigint estimated_fare_paisa "solo estimate"
        timestamptz requested_at
        timestamptz expires_at
        varchar cancel_reason
        timestamptz cancelled_at
        timestamptz completed_at
        timestamptz created_at
        timestamptz updated_at
    }
    pools {
        uuid id PK
        uuid driver_id FK
        uuid vehicle_id FK
        varchar pickup_zone_code FK
        pool_status status
        smallint capacity "snapshot of vehicle capacity"
        smallint occupied_seats "CHECK 0 to capacity"
        boolean is_private "first member opted out"
        gender_restriction gender_restriction "NONE, FEMALE_ONLY, MALE_ONLY"
        varchar cancel_reason
        timestamptz created_at
        timestamptz arrived_at
        timestamptz started_at
        timestamptz completed_at
        timestamptz cancelled_at
        timestamptz updated_at
    }
    pool_members {
        uuid id PK
        uuid pool_id FK
        uuid ride_request_id FK
        smallint seats
        timestamptz joined_at
        timestamptz left_at "set if removed before start"
        smallint dropoff_order
        timestamptz dropped_off_at
    }
    fares {
        uuid id PK
        uuid ride_request_id FK
        charge_type type "RIDE or CANCELLATION_FEE"
        int base_paisa
        int distance_m
        int per_km_paisa
        bigint distance_charge_paisa
        int discount_bps
        bigint discount_paisa
        smallint seats
        boolean pooled
        bigint total_paisa
        timestamptz locked_at
    }
    payments {
        uuid id PK
        uuid fare_id FK, UK
        uuid ride_request_id FK
        payment_method method
        payment_status status
        bigint amount_paisa
        uuid wallet_transaction_id FK, UK
        uuid collected_by_id FK "driver who took cash"
        timestamptz paid_at
        timestamptz created_at
    }
    wallets {
        uuid id PK
        uuid passenger_id FK, UK
        bigint balance_paisa "CHECK >= 0"
        timestamptz updated_at
    }
    wallet_transactions {
        uuid id PK
        uuid wallet_id FK
        wallet_txn_type type
        bigint amount_paisa "signed, never 0"
        bigint balance_after_paisa
        uuid ride_request_id FK
        varchar reason "e.g. SEED opening balance"
        timestamptz created_at
    }
    status_history {
        bigint id PK "auto-increment: total order"
        audit_entity entity_type
        uuid entity_id "polymorphic, no FK"
        varchar from_status
        varchar to_status
        uuid actor_user_id FK
        actor_role actor_role
        varchar reason
        jsonb metadata
        timestamptz created_at
    }
```

Money is always integer **paisa** (1 taka = 100 paisa) in 64-bit columns; distances are integer metres. The table dictionary, every integrity constraint and where it lives, the indexes and a worked data example are in [ERD.md](docs/ERD.md).

## Tech stack and why

| Layer | Choice | Why | Record |
|---|---|---|---|
| Web | Next.js (App Router), TanStack Query, react-hook-form, Tailwind CSS | Mandated React/Next.js; server layouts guard routes by role; polling and cache invalidation in a few lines | [ADR-0012](docs/adr/0012-frontend-nextjs-tanstack-query-tailwind.md) |
| Visual style | Neo-brutalism: thick black borders, hard shadows, flat colours | High contrast and visible focus by default; one token file and a small UI kit | [ADR-0013](docs/adr/0013-neo-brutalist-ui-style.md) |
| API | Express 5 + TypeScript (strict) | Small, well-known, explicit middleware pipeline; nothing hidden | [ADR-0003](docs/adr/0003-express-typescript.md) |
| API style | REST/JSON with command endpoints (`/arrive`, `/start`, `/cancel`) | Each state transition is one explicit, validated command | [ADR-0007](docs/adr/0007-rest-with-command-endpoints.md) |
| Database | PostgreSQL 16 | Row locks, CHECK constraints and partial unique indexes enforce the rules at the source | [ADR-0002](docs/adr/0002-postgresql.md) |
| Data access | Prisma, plus hand-written SQL migrations for integrity constraints | Typed queries and migrations; the constraints Prisma cannot express stay in SQL | [ADR-0004](docs/adr/0004-prisma-with-hand-written-integrity-sql.md) |
| Auth | Server-side sessions in the database, httpOnly cookie, bcrypt | Revocable sign-out, no tokens in JavaScript | [ADR-0005](docs/adr/0005-db-sessions-and-same-origin-proxy.md) |
| Validation | Zod schemas shared by the API and the web forms | One definition of every rule the user can break | [ADR-0008](docs/adr/0008-npm-workspaces-monorepo.md) |
| Concurrency | Row locks + compare-and-set + database constraints | See [Concurrency](#concurrency-the-last-seat-problem) | [ADR-0006](docs/adr/0006-concurrency-row-locks-cas-constraints.md) |
| Tests | Vitest + Supertest against a real PostgreSQL | Locks and constraints only behave truthfully on the real engine | [ADR-0011](docs/adr/0011-testing-vitest-supertest-real-postgres.md) |
| Runtime | Docker Compose, Node 24 on Debian slim images | One command on any machine | [ADR-0009](docs/adr/0009-docker-first-deployment.md) |

Deliberately **not** used: microservices, message queues, Redis, WebSockets, Kubernetes. None solves a problem the MVP has; the [scaling notes](docs/SCALING.md) say when each would become worth it.

## Project structure

```text
.
├── apps/
│   ├── api/                 Express + TypeScript API
│   │   ├── prisma/          schema, migrations (incl. hand-written integrity SQL), seed
│   │   ├── src/
│   │   │   ├── config/      env.ts (validated settings) · rules.ts (business constants)
│   │   │   ├── domain/      pure rules: fare, matching, state machine, cancellation, money
│   │   │   ├── modules/     one folder per feature: routes · controller · service · repository
│   │   │   ├── middleware/  request id, logging, sessions, auth, validation, errors
│   │   │   ├── db/          Prisma client, transactions, row locks, error mapping
│   │   │   └── jobs/        request-expiry sweeper
│   │   └── test/            integration, concurrency, domain and end-to-end tests
│   └── web/                 Next.js app
│       └── src/
│           ├── app/         (auth) · (passenger) · (driver) route groups
│           ├── components/  ui/ (neo-brutalist kit) · rides/ · pools/
│           └── lib/         API client, query hooks and keys, labels, formatting
├── packages/shared/         enums, Zod schemas, API types, transition tables
├── scripts/                 load-smoke.mjs (performance smoke test)
├── docker/                  database init (creates the test database)
└── docs/                    SRS, architecture, ERD, ADRs, conventions, tracker
```

## Local development

For working on the code without rebuilding images. Requires **Node 24** (see `.nvmrc`) and npm.

```bash
cp .env.example .env
npm ci
docker compose up -d db        # only PostgreSQL (also creates dhakapool_test)
npm run db:migrate             # apply migrations
npm run db:seed                # zones and demo personas
npm run dev:api                # API on http://localhost:4000 (restarts on change)
npm run dev:web                # web app on http://localhost:3000 (in another terminal)
```

Outside production, the sign-in page lists the demo accounts and `/styleguide` shows every UI component.

| Task | Command |
|---|---|
| Lint, type-check and test everything (run before every commit) | `npm run lint && npm run typecheck && npm test` |
| Format | `npm run format` |
| Build all workspaces | `npm run build` |
| Load smoke test against a running API | `npm run load:smoke` |

## Environment variables

All variables are listed with safe defaults in [`.env.example`](.env.example). Real secrets are never committed; `.env` is git-ignored.

| Variable | Default | Purpose |
|---|---|---|
| `POSTGRES_USER` · `POSTGRES_PASSWORD` · `POSTGRES_DB` | `dhakapool` · `change-me` · `dhakapool` | Database container |
| `DB_PORT` | `5432` | Host port of the database |
| `DATABASE_URL` · `DIRECT_URL` | local Postgres | API connection (pooled) and migrations (direct) |
| `TEST_DATABASE_URL` | `…/dhakapool_test` | Tests only; never the development database |
| `API_PORT` · `WEB_ORIGIN` · `LOG_LEVEL` | `4000` · `http://localhost:3000` · `info` | API |
| `SESSION_TTL_HOURS` · `COOKIE_SECURE` · `BCRYPT_COST` | `168` · `false` · `12` | Sessions and password hashing; set `COOKIE_SECURE=true` behind HTTPS |
| `TRUST_PROXY_HOPS` | `1` | Proxies in front of the API, for per-client rate limits; `2` when hosted behind Vercel and Railway |
| `SEED_DEMO_PASSWORD` | `"TeslaPool#2026"` | Password of every seeded persona. Keep the quotes: without them Node reads `#` as a comment |
| `API_INTERNAL_URL` | `http://localhost:4000` | Where the web app forwards `/api/*` (fixed at build time) |
| `FARE_BASE_PAISA` · `FARE_PER_KM_PAISA` · `FARE_POOL_DISCOUNT_BPS` | `3000` · `1500` · `2000` | Fare rates: ৳30 base, ৳15/km, 20 % pool discount on the distance charge |
| `CANCELLATION_FEE_PAISA` · `NO_SHOW_WAIT_MINUTES` | `2000` · `5` | ৳20 fee after the driver arrives; wait before a no-show |
| `REQUEST_EXPIRY_MINUTES` · `POOL_JOIN_WINDOW_MINUTES` | `15` · `10` | Unmatched requests expire; how late a request may join a trip |

Business rules are tuned here, not in code: change a value, restart the API. [CODING_CONVENTIONS.md §10](docs/CODING_CONVENTIONS.md) lists how to change each rule safely.

## Tests

```bash
docker compose up -d db && npm test          # on your machine
docker compose run --rm api npm test         # inside Docker
```

245 automated tests (232 API, 13 shared) run against a real PostgreSQL test database, never a mock, because locks and constraints only behave truthfully on the real engine. Test names read as examples with the personas, for example *"rejects Shirin when Bullet's last seat is already taken"*.

| Risk | What proves it | Where |
|---|---|---|
| Bullet's capacity can never be exceeded | Accept refuses a request that does not fit; the database CHECK refuses it too | `apps/api/test/pools/accept.test.ts`, `test/db/constraints.test.ts` |
| Invalid state transitions are rejected | The full transition matrix, and every command from every wrong state | `test/domain/state-machine.test.ts`, `test/pools/trip.test.ts` |
| Nusrat's and Rafiq's pooled fares are correct | The worked examples: ৳66.00 and ৳60.00 shared, ৳75.00 and ৳67.50 alone | `test/domain/fare.test.ts`, `test/e2e/scenarios.test.ts` |
| Users cannot modify another user's ride | Another passenger's ride and another driver's trip answer 404 | `test/auth/access.test.ts`, `test/pools/trip.test.ts` |
| Cancellation rules hold | Free before arrival, ৳20 after, refused once started | `test/rides/cancel.test.ts`, `test/wallet/fees.test.ts` |
| Concurrent requests cannot corrupt capacity | Nusrat and Shirin race for the last seat, and Jashim and Kamal race for one request, each 20 times over real HTTP | `test/pools/concurrency.test.ts` |

`test/e2e/scenarios.test.ts` runs the SRS scenarios E1–E5 end to end through the API, and every wallet test checks that each balance still equals the sum of its ledger.

**Performance:** `npm run load:smoke` runs 20 concurrent users for 60 s over the most used read endpoints. On a local Docker stack: 87,367 requests, 0 failed, p95 26.5 ms (target: under 300 ms).

## API overview

REST over JSON. Every route except sign-up, sign-in and health needs a session; each checks the role and the ownership of the resource.

| Method & path | Who | Purpose |
|---|---|---|
| `POST /api/auth/signup` · `/login` · `/logout`, `GET /api/auth/me` | Anyone | Accounts and session |
| `GET /api/zones` | Signed in | The zone list |
| `POST /api/fares/estimate` | Passenger | Solo and shared price for a trip |
| `POST /api/rides`, `GET /api/rides?scope=active\|history`, `GET /api/rides/:id` | Passenger (owner) | Request a ride, list, view with timeline |
| `POST /api/rides/:id/cancel` | Passenger (owner) | Cancel, with the fee rules |
| `GET /api/wallet`, `GET /api/wallet/transactions`, `POST /api/wallet/topup` | Passenger | TeslaPay |
| `GET` · `PUT /api/driver/availability` | Driver | Status; go online in a zone or offline |
| `GET /api/driver/requests`, `POST /api/driver/requests/:id/accept` | Driver | Relevant waiting requests; accept into the trip |
| `GET /api/driver/pools?scope=active\|history` | Driver (owner) | Current trip and history |
| `POST /api/pools/:id/arrive` · `/start` · `/cancel` | Driver (owner) | Trip transitions |
| `POST /api/pools/:id/members/:rideId/complete` · `/no-show` · `/cash-collected` | Driver (owner) | Per-passenger transitions and cash |
| `GET /health` | Anyone | Liveness and database readiness |

Every error has the same shape, with a stable code and a message written for people:

```json
{ "error": { "code": "CAPACITY_EXCEEDED", "message": "Bullet has only 1 free seat.", "details": { "freeSeats": 1 } }, "requestId": "…" }
```

The full list of codes is in [SRS §8.2](docs/SRS.md#82-software-interface--rest-api-overview).

## Business rules

The rules are specified in [SRS §5–6](docs/SRS.md#6-business-rules); each is cited by its ID in the code.

**Lifecycle.** A passenger's ride and a Tesla's trip each have their own state machine, because five passengers can be at different stages of one trip.

```text
Ride:  REQUESTED → MATCHED → DRIVER_ARRIVED → STARTED → COMPLETED
           ↘ CANCELLED / EXPIRED (unmatched after 15 min)
Trip:  OPEN → DRIVER_ARRIVED → STARTED → COMPLETED   (or CANCELLED before the start)
```

**Who can share a Tesla (BR-02).** A request may join a trip only if: same pickup zone; everyone opted in to sharing; its destination is the same as, or adjacent to, every passenger's destination; it came within 10 minutes of the trip forming; the seats fit; and any same-gender rule is respected. Nusrat (→ Mohakhali) and Rafiq (→ Gulshan 1) can share because the two zones are neighbours; a Banani → Uttara request cannot join them.

**Fares (BR-10 to BR-12).** Per seat: `৳30 base + ৳15 per km − 20 % of the distance charge when pooled`. The estimate is shown at request time; the fare is fixed when the trip starts, and it counts as pooled only if two or more passengers start together.

| Passenger | Route | Alone | Shared |
|---|---|---|---|
| Nusrat | Banani → Mohakhali, 3.0 km | ৳30 + ৳45 = **৳75.00** | ৳75 − ৳9 = **৳66.00** |
| Rafiq | Banani → Gulshan 1, 2.5 km | ৳30 + ৳37.50 = **৳67.50** | ৳67.50 − ৳7.50 = **৳60.00** |

**Cancellation (BR-07).** Free before the driver arrives; ৳20 after arrival; not possible once the trip has started. A driver may mark a no-show 5 minutes after arriving (same fee) or cancel the trip before the start, which returns the passengers to the queue at no cost.

**Payment.** TeslaPay is debited at drop-off; if the balance is short, the ride falls back to cash. Cash rides stay *cash due* until the driver records the collection.

**Assumptions** are listed with their reasons in [SRS §13.1](docs/SRS.md#131-assumptions-register). For example, pickup is the zone itself (A-02), and gender is optional, self-declared and never shown to co-riders (A-19, A-20).

## Concurrency: the last-seat problem

Bullet has one free seat. Nusrat and Shirin are both accepted at the same instant, and both requests first see one seat available. Exactly one must succeed.

**Now: four layers, all inside one PostgreSQL transaction** ([ADR-0006](docs/adr/0006-concurrency-row-locks-cas-constraints.md)):

1. **Serialise.** The accept locks the driver row and then the trip row (`SELECT … FOR UPDATE`). The second accept waits, then re-reads the seats and is refused with `CAPACITY_EXCEEDED`. Locks are always taken in the order driver → pool → ride → wallet, so two commands can never deadlock.
2. **Compare-and-set.** A status change is `UPDATE … WHERE id = ? AND status = ?` and must touch exactly one row, so a cancel racing an accept, or two drivers accepting the same request, cannot both win.
3. **Database constraints.** `CHECK (occupied_seats BETWEEN 0 AND capacity)`, a non-negative wallet balance, and partial unique indexes (one active ride per passenger, one active trip per driver) hold even if application code were wrong.
4. **Atomicity.** Membership, seats, fares, payments, ledger and audit rows commit together or not at all.

Transactions are short (no network calls inside), `lock_timeout` is 3 s, and PostgreSQL's default READ COMMITTED isolation is enough because every decision is made after taking the lock. The concurrency tests run each race 20 times over real HTTP, with fresh data every time.

**At larger scale.** One database and row locks are the right choice for this MVP. The next section sets out what a city-wide service would change, and why the transactional core stays as it is.

## Scaling to 1M passengers and 100k drivers

The MVP is one PostgreSQL database behind one Express process, which is the right shape for the traffic it has. These figures set the order of magnitude that drives every change below; the working is in [SCALING.md](docs/SCALING.md).

| At peak | Estimate |
|---|---|
| Ride requests | ~13 per second |
| Status polling at today's 4 s interval | ~15,000 requests per second |
| Driver location updates, once GPS is added | ~8,000 writes per second |

**The shape of the problem.** The business writes are tiny: a dozen requests and a few dozen accepts per second, which one PostgreSQL primary handles comfortably. Almost all the load is live status reads and driver locations, and neither needs the transactional core. So the work is to move that traffic off the database and to remove lock contention at busy pickups, not to shard the ledger.

```mermaid
flowchart LR
    subgraph clients["Clients"]
        PA["Passenger app"]
        DA["Driver app"]
    end

    CDN["CDN<br/>static web assets"]
    LB["Edge: load balancer and API gateway<br/>TLS · WAF · routing<br/>session auth · rate limits per user and IP<br/>idempotency keys"]

    subgraph stateless["Stateless API instances, scaled on p95 latency"]
        RIDE["Ride service<br/>estimate · request · cancel"]
        POOL["Pool service<br/>arrive · start · drop off · cash"]
        WAL["Wallet service<br/>top up · settle at drop-off"]
        LOC["Location service<br/>position ingest"]
    end

    subgraph matchers["Matching, partitioned by pickup cell"]
        M1["Matcher: cells A to F<br/>single writer per cell"]
        M2["Matcher: cells G to L"]
    end

    RT["Realtime gateway<br/>WebSocket or SSE push"]
    NOTIF["Notification service<br/>APNs · FCM"]
    OBS["Observability<br/>metrics · traces · logs · SLOs"]

    GEO[("Geo index<br/>driver positions by H3 cell<br/>in memory, not durable")]
    CACHE[("Shared cache<br/>sessions · zones · adjacency<br/>fare rates · rate-limit counters")]
    PGB["Connection pooler"]
    PG[("PostgreSQL primary<br/>rides · pools · fares · payments · ledger<br/>CHECK constraints · partial unique indexes")]
    RR[("Read replicas<br/>ride and trip history · wallet statements")]
    OUT[["Outbox relay to event log<br/>ride · pool · payment events"]]

    PA --> CDN
    DA --> CDN
    PA -- "requestRide · cancelRide · topUp" --> LB
    DA -- "goOnline · acceptRequest · arrive · start · dropOff" --> LB
    DA -- "updateLocation every 5 s" --> LB
    LB --> RIDE
    LB --> POOL
    LB --> WAL
    LB --> LOC
    LOC --> GEO
    RIDE -- "enqueue on its cell" --> M1
    RIDE --> M2
    M1 -- "candidate drivers" --> GEO
    M2 --> GEO
    M1 -- "one transaction per accept" --> PGB
    M2 --> PGB
    RIDE --> PGB
    POOL --> PGB
    WAL --> PGB
    PGB --> PG
    RIDE -- "history, statements" --> RR
    PG -- "streaming replication" --> RR
    RIDE --> CACHE
    POOL --> CACHE
    LB --> CACHE
    PG -- "outbox row, same transaction" --> OUT
    OUT --> RT
    OUT --> NOTIF
    OUT --> OBS
    RT -- "your ride changed" --> PA
    RT --> DA
    NOTIF -- "new request nearby" --> DA
```

**How each concern is handled.**

| Concern | At scale | Why |
|---|---|---|
| Load balancing | One entry point terminating TLS, with a WAF, spreading traffic across API instances | Instances scale on CPU and latency, and abusive traffic is filtered before it costs a database connection |
| Horizontal scaling | Move the two in-memory items, the rate-limit counters and the zone cache, into the shared cache | They are the only reason an API instance is not already interchangeable |
| Database indexing | Every list and lookup path is indexed today ([ERD §5](docs/ERD.md)); `status_history` and `wallet_transactions` are partitioned by month | They become the largest tables, and old partitions can then be archived without touching hot data |
| Read replicas | History and wallet statements read from replicas; commands and a passenger's active ride stay on the primary | Those reads tolerate a second of lag, but a command must read its own writes |
| Caching | Zones, adjacency, fare rates and sessions cached with the version in the key. Seat counts and ride state are never cached for a command | A stale seat count is precisely the bug the design exists to prevent |
| Geospatial search | H3 cells replace fixed zones, so "nearby" becomes the same cell or a neighbouring ring, and positions live in an in-memory geo index | 8,000 position writes per second have no business in the transactional database |
| Ride matching | One matcher per pickup cell, so every decision about a trip is made by one process in order, with automatic dispatch replacing the manual feed | Single writer converts lock contention into ordering, and 40,000 online drivers cannot scan a shared feed |
| Database contention | Contention is local to one trip's rows; the single writer removes the waits, and a connection pooler keeps connections bounded | Row locks stay correct at any scale; what grows is waiting, not wrongness |
| Queues and events | Each commit writes an outbox row in the same transaction, relayed to an event log consumed by push, notifications and analytics | Keeps "the database changed" and "the event was sent" consistent with no distributed transaction, and no consumer sits on the command path |
| Real-time communication | A push gateway fed by the event log sends each passenger only their own ride's changes; polling stays as the fallback on poor networks | This is the 15,000 requests per second, and it disappears |
| Rate limiting | Limits at the edge in a shared store, keyed by user as well as IP, strict on sign-in and ride creation | Credential stuffing and request spam are the paths worth paying to block |
| Idempotency | Every command carries an idempotency key; the first result is stored against it and replayed on retry | A retried accept or top-up on a flaky mobile network must not act twice |
| Retry and failure | Automatic retry only for lock timeouts, connection resets and matcher queue work, with back-off, jitter and circuit breakers around routing and payments | Business refusals such as 409 and 422 are decisions, not failures, so retrying them is wrong |
| Observability | Metrics including lock waits and matcher queue depth, traces across API, matcher and database, and SLOs on time to match and p95 command latency | Alerts fire on what a passenger feels, not on raw CPU |
| Security | Sessions unchanged, WAF at the edge, secrets in a managed store with rotation, personal data minimised and encrypted at rest, card data kept outside the API's PCI scope | The threat model grows with the user count, and the session design already survives it |
| Deployment | Managed containers with health checks, rolling deploys and automatic rollback; expand-and-contract migrations; feature flags per city area | No migration may lock a hot table, and new matching behaviour is proven in one area first |

**What does not change.** The two state machines, the fare formula in integer paisa fixed at trip start, one transaction per business command, and the database constraints as the last line of defence. Matching by single writer removes the lock waits, but if two matchers ever disagreed, the seat CHECK constraint and the partial unique indexes would still refuse the second write. [SCALING.md](docs/SCALING.md) has the load working, the detail behind each topic, and the order in which these steps are taken, each triggered by a measurement rather than a date.

## Key decisions and trade-offs

| Decision | Alternative | Why |
|---|---|---|
| Zones with a fixed distance and adjacency table | Real routing / map API | Deterministic, hand-checkable fares and matching; the brief asks not to rebuild maps |
| Two state machines (ride and trip) | One combined lifecycle | Passengers in one trip can be at different stages (one dropped off, one still riding) |
| Fare fixed at trip start; pooled only if 2+ passengers start together | Fix at request, or at drop-off | The discount is given only when the Tesla really was shared, and the price cannot change after boarding |
| Integer paisa everywhere | Decimal or floating point | Exact arithmetic; the worked examples can be checked by hand |
| Pessimistic row locks for trips | Optimistic versioning with retries | Contention is local to one Tesla; a short lock is simple to reason about and test |
| Polling every 4 s | WebSockets | Enough for the MVP with far fewer moving parts; push is the upgrade path |
| Database sessions behind a same-origin proxy | JWT in local storage | Revocable sign-out, no token readable by scripts, no CORS setup |
| Tests on real PostgreSQL | Mocks or SQLite | Locks and constraints are exactly what needs proving |
| Driver accepts each request explicitly | Automatic dispatch | Matches the brief ("accept a ride/pool") and keeps the driver in control |

All decisions and their alternatives are logged in [SRS §13.2](docs/SRS.md#132-decisions-log) and the [ADRs](docs/adr/README.md).

## AI usage

Generative AI was used as a drafting and review tool throughout this project. Every design decision was made by the developer, and every change that reached `master` was read, run and committed by hand.

| Tool | Used for |
|---|---|
| **Claude Sonnet 5** | Planning the phased delivery; drafting the SRS, the architecture document, the ERD, the ADRs and this README; checking requirement traceability against the tracker |
| **OpenCode (DeepSeek v4 Pro)** | Writing the application code: the API modules, the web app and the test suite |

**How the output was kept honest.**

- Every business rule in the code cites the SRS ID it implements, so any generated line can be traced back to a stated requirement. Anything that matched no requirement was removed rather than kept because it looked plausible.
- `npm run lint && npm run typecheck && npm test` passed before each commit. The suite runs against a real PostgreSQL database ([ADR-0011](docs/adr/0011-testing-vitest-supertest-real-postgres.md)), because locks and constraints are exactly the part that cannot be taken on trust.
- The lint limits in [`eslint.simplicity.mjs`](eslint.simplicity.mjs) allow 200 lines a file, 50 a function, complexity 8 and no `any`, which keeps every file small enough to review in one sitting.
- The history is a sequence of small, single-purpose commits, so each step can be read and judged on its own.

**A suggestion that was accepted.** The layered defence against the last-seat race in [ADR-0006](docs/adr/0006-concurrency-row-locks-cas-constraints.md): a fixed lock order (driver → pool → ride → wallet) to make deadlock impossible, compare-and-set status updates so a race cannot produce two winners, and database CHECK constraints and partial unique indexes as a backstop if the application code were ever wrong. It was adopted in full, and `test/pools/concurrency.test.ts` runs each race twenty times over real HTTP to prove it.

**A suggestion that was rejected.** Drizzle ORM was recommended for data access, on the grounds that it expresses row locks, CHECK constraints and partial indexes in its own schema. Prisma was chosen instead: its migrations, generated types and seeding were the better fit, and the four gaps Drizzle would have covered natively are closed explicitly in [`db/lock.ts`](apps/api/src/db/lock.ts) and one hand-written SQL migration, visible in the repository rather than buried in an abstraction. Both options and the trade-off are recorded in [ADR-0004](docs/adr/0004-prisma-with-hand-written-integrity-sql.md).

**A recommendation that had to change.** Railway was planned for the API in [ADR-0009](docs/adr/0009-docker-first-deployment.md), but its free plan granted only a dollar of credit a month, which cannot keep a service running, so the documented fallback, Render, was used first. The hosted demo now runs on Railway as ADR-0009 originally planned (amendment below); [`render.yaml`](render.yaml) remains the documented free fallback.

## Known limitations

- Geography is ten Dhaka zones (Banani, Gulshan 1 and 2, Mohakhali, Tejgaon, Farmgate, Dhanmondi, Mirpur, Uttara, Bashundhara); pickup is the zone, not an address.
- Status updates arrive by polling, so a change can take up to 4 s to appear.
- TeslaPay is simulated: top-ups are free, and there is no hold on the balance between request and drop-off (a short balance falls back to cash).
- A cancellation fee on a cash ride is recorded as unpaid; collecting it later is not implemented.
- Gender is self-declared and not verified.
- One API instance is assumed: sign-in rate limits and the zone cache live in memory, and each instance would run its own expiry sweep (still correct, just redundant).

## Next improvements

Real routing and ETAs with detour-based matching; live GPS; push updates; automatic dispatch across drivers; ratings; an admin console; notifications; surge pricing; wallet pre-authorisation; collecting unpaid fees; driver onboarding; more cities. See [SRS §13.4](docs/SRS.md#134-out-of-scope--next-improvements).

## Deployment

Docker Compose runs the full stack anywhere (see [Quick start](#quick-start-docker)). The hosted demo uses Vercel, Railway and Supabase ([ADR-0009](docs/adr/0009-docker-first-deployment.md), [ARCHITECTURE §12.2](docs/ARCHITECTURE.md#122-later-free-tier-hosting-nfr-por-04-adr-0009)):

| Part | Host | Configuration |
|---|---|---|
| Web app | Vercel (Hobby) | Root Directory `apps/web`, [`apps/web/vercel.json`](apps/web/vercel.json) |
| API | Railway (same Dockerfile) | `railway up` from the repository root |
| Database | Supabase (free) | connection strings below |

The demo is live at **<https://dhakapool-web.vercel.app/>**; the API answers on its own Railway address at `/health`.
`render.yaml` remains the documented free fallback for the API from ADR-0009's guardrail.

**1. Database: Supabase.** Create a project (the demo uses *Seoul, ap-northeast-2*) and note the database password. Under **Connect**, copy the **Session pooler** connection string (IPv4). From it make two values:

```text
DATABASE_URL = postgresql://postgres.<ref>:<password>@<pooler-host>:5432/postgres?sslmode=no-verify
DIRECT_URL   = postgresql://postgres.<ref>:<password>@<pooler-host>:5432/postgres?sslmode=require
```

The app connects through node-postgres, which reads `sslmode=require` as "verify the certificate" and would reject Supabase's; `no-verify` keeps the connection encrypted. Migrations run through Prisma, which accepts `sslmode=require`. On the free plan the direct connection is IPv6-only, so everything uses the IPv4 session pooler, whose session mode keeps interactive transactions, `SET LOCAL lock_timeout` and `FOR UPDATE` behaving exactly as locally. Apply the migrations and seed once, from the repository root:

```bash
DIRECT_URL=… DATABASE_URL=… SEED_DEMO_PASSWORD='TeslaPool#2026' \
  npm run db:deploy -w @dhakapool/api && npm run db:seed -w @dhakapool/api
```

**2. API: Railway.** `railway init -n dhakapool`, `railway add --service api`, then set the service variables:

| Variable | Value |
|---|---|
| `DATABASE_URL` · `DIRECT_URL` | the two Supabase values above |
| `SEED_DEMO_PASSWORD` | `TeslaPool#2026` (demo personas, documented above) |
| `WEB_ORIGIN` | the Vercel address from step 3 (a placeholder first, then redeploy) |
| `COOKIE_SECURE` | `true` (HTTPS only) |
| `TRUST_PROXY_HOPS` | `2` (Vercel's rewrite plus Railway's load balancer, NFR-SEC-07) |
| `PORT` · `API_PORT` | `4000` (Railway routes to `PORT`; the API reads `API_PORT`) |
| `RAILWAY_DOCKERFILE_PATH` | `apps/api/Dockerfile` (the Dockerfile is not at the repository root) |

Set the **healthcheck path** to `/health` and the timeout to 600 s (the container migrates and seeds before listening; `docker compose` and the service settings both use `/health`). Deploy with `railway up --service api` from the repository root; the container runs `prisma migrate deploy`, seeds and starts the server. `railway domain` prints the public address; check `https://<api-name>.up.railway.app/health`.

**3. Web: Vercel.** *Add New → Project*, import this repository, and set **Root Directory** to `apps/web`. Add the environment variable `API_INTERNAL_URL = https://<api-name>.up.railway.app` for all environments before the first build, because the `/api` rewrite is fixed at build time. Turn **Deployment Protection** off so visitors reach the demo without a Vercel login. Deploy, then put the Vercel address into `WEB_ORIGIN` on Railway and redeploy the API.

**Before a demo.** Open the API's `/health` first and wait for `{"status":"ok","db":"up"}`. A Supabase project pauses after a week without activity and is resumed from its dashboard.
