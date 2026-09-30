# Changelog

All notable changes to Dhaka Tesla Pool. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and the project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html). Entries are grouped from the
conventional commit history; each requirement ID refers to [`docs/SRS.md`](docs/SRS.md).

## [1.0.0] - 2026-10-01

First release: the complete MVP, built over 88 commits on twelve feature branches between 2026-09-23 and 2026-10-01.

### Added

**Accounts and sessions**

- Passenger sign-up and sign-in, with an optional self-declared gender used only for same-gender rides (FR-AUTH-01, FR-AUTH-02).
- Opaque session tokens stored hashed in the database behind an httpOnly cookie, with sign-out that revokes them server-side (FR-AUTH-03, ADR-0005).
- Role-based routing: passengers and drivers reach their own pages and are blocked from the other role's (FR-AUTH-05).
- Per-IP rate limiting on sign-up and sign-in (NFR-SEC-06).
- Password fields can be revealed, and sign-up asks for the password twice (FR-AUTH-08).

**Rides and pooling**

- Ten Dhaka zones with a fixed distance and adjacency table, and a fare estimate for a trip before it is requested (FR-PAX-01, FR-PAX-02).
- Ride requests with seats, sharing, same-gender and payment choices, and cancellation under the fee rules (FR-PAX-03, BR-07).
- A driver accepts each compatible request into one pool: same pickup zone, adjacent destinations, inside the join window, seats permitting (BR-02).
- Women-only and men-only trips (BR-18).
- Arrive, start, per-passenger drop-off, no-show and trip cancellation, each allowed only where the state machine permits it (FR-DRV-07 to FR-DRV-12).
- Requests expire after 15 minutes without a job queue, swept in process and checked again on every command (NFR-REL-04).

**Fares and TeslaPay**

- Fares in integer paisa: ৳30 base plus ৳15 per kilometre, less 20 % of the distance charge when the Tesla really was shared, fixed when the trip starts (BR-10 to BR-12).
- The simulated TeslaPay wallet with a balance, top-ups between ৳50 and ৳5,000, and a statement whose entries always sum to the balance (FR-PAY-01, FR-PAY-02, FR-PAY-06).
- Settlement at drop-off, falling back to cash when the balance is short, and cancellation fees recorded the same way (BR-07, A-14).

**Web app**

- Passenger screens: request a ride, follow it live, history, ride detail with the fare breakdown and timeline, and the wallet.
- Driver screens: dashboard with the availability toggle, the waiting-request feed, the active trip, and trip history.
- A neo-brutalist component kit with tokens, plus loading, empty and error states on every data-driven view (ADR-0013, NFR-USA-01).
- Live views poll every four seconds while a ride or trip is active and stop when it ends (ADR-0010).

**Correctness and operations**

- An append-only audit trail of every status change, with the actor who made it, and no path to update or delete one (FR-HIST-01, FR-HIST-02).
- 245 automated tests against a real PostgreSQL database, including the last-seat race run twenty times over HTTP (ADR-0011, NFR-CON-01).
- A load smoke script for the read endpoints (NFR-PERF-01).
- Docker Compose for the whole stack, and a hosted demo on Vercel, Railway and Supabase (ADR-0009).

### Fixed

- The last free seat can never be sold twice, and a cancel racing an accept cannot leave a pool inconsistent: row locks in a fixed order, compare-and-set status changes, and database constraints as the final guarantee (ADR-0006).
- The layout no longer shifts sideways when a page grows past the viewport, for example as the fare estimate appears or when moving between a short page and a long one.
- The driver header marks only the page actually open, instead of also marking Dashboard on every page beneath it.
- Migrations run over `DIRECT_URL` as documented, the API trusts as many proxy hops as the deployment has, and the API image carries OpenSSL for Prisma.

### Security

- Passwords hashed with bcrypt; session tokens stored only as SHA-256 hashes.
- Unexpected errors reach the client without internal details, proven by a test.
- A passenger never sees a co-rider's name, destination, fare or gender, only how many co-riders there are (A-09, A-20).

[1.0.0]: https://github.com/MahadiAhmed0/DhakaPool---Ride-Pooling-Shared-Fare-Platform/releases/tag/v1.0.0
