# ADR-0012: Next.js App Router + TanStack Query + Tailwind CSS

- **Status:** Accepted · 2026-09-25 (proposed 2026-09-24; accepted once implemented and verified by the test suite)
- **Deciders:** Golam Mahadi Ahmed
- **Related:** DC-01, FR-PAX-06/07, NFR-USA-01…06, [Architecture §10](../ARCHITECTURE.md#10-frontend-architecture)

## Context

The frontend must be React or Next.js (the PRD recommends the App Router). The screens are simple, but they need:
- correct loading, empty and error states for every view;
- polling;
- role-based routing;
- a mobile-friendly layout.

## Options considered

| Concern | Choice | Alternatives | Why |
|---|---|---|---|
| Framework | **Next.js App Router** | Vite + React Router | Recommended by the PRD. File-based routing with route groups per role. Server layouts for auth guards. `rewrites` give the same-origin API proxy (ADR-0005). `standalone` output gives a small Docker image. |
| Server state | **TanStack Query** | SWR · plain `useEffect` + fetch · Server Actions | Built-in `isLoading`, `isError` and retry map directly to NFR-USA-01. `refetchInterval` provides polling (ADR-0010). Cache invalidation after mutations. The mental model is well documented. |
| Forms | **react-hook-form + zodResolver** | Formik · controlled inputs | Reuses the same Zod schemas as the API (ADR-0008) |
| Styling | **Tailwind CSS** | CSS Modules · MUI / shadcn/ui | Fast to build a clean, responsive UI without the overhead of a component library. Mobile-first utilities help with the 360 px requirement. |

## Decision

- **Rendering:** mostly client components for interactive, polled views. Server components are used for layouts and route guards.
- **API access:** one `apiClient` that turns the standard error JSON into typed errors.
- **Shared UI:** components for the states (`LoadingState`, `EmptyState`, `ErrorState`) and for the domain (`StatusStepper`, `FareBreakdown`, `SeatMeter`, `ConfirmDialog`, `MoneyText`).

## Consequences

- **+** Every screen gets consistent state handling almost for free.
- **−** Two data-access mechanisms coexist (server-component fetch for guards, TanStack Query for data). Convention: server-side fetching is used only for authentication and redirects, and all application data goes through TanStack Query.

## Revisit when

SEO or public pages matter (not the case for a signed-in app) → more server rendering. The design system grows → adopt shadcn/ui on top of Tailwind.
