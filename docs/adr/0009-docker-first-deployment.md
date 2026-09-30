# ADR-0009: Docker Compose first; later Vercel + Railway + Supabase (free tiers)

- **Status:** Accepted · 2026-09-24 (chosen by the product owner/developer); **amended 2026-09-30** — the hosted demo runs on Railway as decision 2 planned (see "Amended" below)
- **Deciders:** Golam Mahadi Ahmed
- **Related:** NFR-POR-01…04, DC-04, DR-09, DR-11, DR-13, [Architecture §12](../ARCHITECTURE.md#12-deployment)

## Context

- PRD §6 requires that the system runs with `docker compose up`, including migrations, seed data and health checks.
- Public deployment is *preferred*, but only on free tiers. If free backend hosting isn't available, a documented reproducible Docker deployment is acceptable.
- Free-tier offerings change often.

## Options considered (hosting, later)

| Option | Pros | Cons |
|---|---|---|
| **A. Vercel (web) + Railway (API container) + Supabase (Postgres)** | Vercel is the natural home for Next.js. Railway runs the same API Dockerfile. Supabase gives managed Postgres 15+ with a pooler. | Railway's free offering has changed over time (trial credit versus paid Hobby). Supabase pauses idle free projects. Three dashboards. |
| B. Render for web + API + Postgres | One provider | Free web services sleep (cold start). Free Postgres expires after about 30 days. |
| C. Vercel + Render + Neon | All with free tiers | API cold starts on Render |
| D. Docker only, with no public URL | Fully reproducible, zero cost | No publicly reachable instance for users or reviewers |

## Decision

1. **Now:** Docker Compose is the primary, fully supported way to run the system. It has three services (`db`, `api`, `web`), health checks, `depends_on: service_healthy`, and automatic `prisma migrate deploy` plus an idempotent seed on API start.
2. **Later (pre-release, task T-25):** deploy to **Vercel + Railway + Supabase** using the same images and configuration:
   - Prisma uses Supabase's **pooler URL** for the app (`DATABASE_URL`, with `pgbouncer=true`) and the **direct URL** for migrations (`DIRECT_URL`).
   - `API_INTERNAL_URL` is set in Vercel at build time, because rewrites are compiled.
   - `COOKIE_SECURE=true` and `WEB_ORIGIN=<vercel url>` are set on Railway.
3. **Guardrail:** before deploying, confirm that Railway can host the API **without paying** (PRD §16). If it can't, fall back to Render's free web service for the API (documenting the cold start). If no free host works, ship the documented Docker deployment only (DR-11).

## Amended 2026-09-30: the hosted demo runs on Railway

The demo was first deployed to the Render fallback (2026-09-25), as recorded in Architecture §12.2. On 2026-09-30 the owner moved the API to Railway — the option this ADR picked first — accepting the plan's cost rather than the PRD's free-only rule. The configuration is the same otherwise, with three Railway-specific settings:

- **Dockerfile detection:** Railway's builders only auto-detect a Dockerfile at the repository root, so the service sets `RAILWAY_DOCKERFILE_PATH=apps/api/Dockerfile`.
- **Ports:** Railway routes to its `PORT` variable and the API reads `API_PORT`, so both are set to `4000`.
- **Healthcheck:** path `/health`, timeout 600 s — the container runs `prisma migrate deploy` and the seed before it listens.

Everything else in the decision stands: the same Dockerfile as Docker Compose, Supabase's IPv4 session pooler for `DATABASE_URL` (app, `sslmode=no-verify`) and `DIRECT_URL` (migrations, `sslmode=require`), `API_INTERNAL_URL` set on Vercel before the build, `COOKIE_SECURE=true` and `TRUST_PROXY_HOPS=2` on the API, and `render.yaml` kept as the documented free fallback. The demo project lives in Supabase's ap-northeast-2 (Seoul) region.

## Consequences

- **+** The primary run path (`docker compose up`) never depends on third-party availability.
- **+** The same Dockerfile serves local runs and Railway, so local and cloud environments stay consistent.
- **−** The Supabase free project must be woken before demos, and first requests may be slow.
- **−** Environment-specific settings (cookie `Secure`, origins, pooler URLs) must be documented carefully in the README.

## Revisit when

Free-tier terms change, or real users arrive. Then consolidate onto one paid provider with managed Postgres, autoscaling and uptime monitoring.
