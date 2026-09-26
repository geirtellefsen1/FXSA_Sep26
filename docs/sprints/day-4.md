# Day 4 — apps/web scaffold, shell, Cockpit + Customers wired to the API

**Shipped**

- `apps/web`: Vite 6 + React 18 + TypeScript, `@tanstack/react-query` for data fetching, Playwright for smoke tests. Dev server proxies `/api` to `:3000` (`vite.config.ts`).
- `packages/api-client` gained a real `Membership`/`Me` type (was `unknown[]`) so the web app doesn't hand-roll the `/api/me` shape a second time.
- Ported from `ux/prototype/` into typed, individually-exported TSX (no more `Object.assign(window, …)`):
  - `icons.tsx` — the ~50-case icon switch, unchanged visually.
  - `components.tsx` — `Btn`, `Badge`, `Avatar`, `Card`, `Kpi`, `AiCard`, `SevDot`, `Money`, `Spark`, `ChannelChip`, `Tabs`, `Modal`, `HeatStrip`, `Donut`, `Empty`. `Money` now takes the API's `{ amount_minor, currency }` shape directly instead of a mock major-unit number.
  - `tenants.tsx` — **rewritten**, not just ported: the prototype's hardcoded `FXTENANTS` array is gone. `TenantProvider` calls `GET /api/me` once (no `X-Tenant`, so it resolves to the caller's own memberships), then holds the selected tenant and hands out a tenant-scoped `FxApiClient` (`useApiClient()`) that every screen fetches through. Switching tenants recreates that client with a new `X-Tenant` header — no page reload.
  - `shell.tsx` — `Sidebar`/`Topbar`/`FlexistoreLogo`. Nav badges (inbox unread, AI proposals, arrears count) are dropped rather than faked: the prototype sourced them from a mock "day scenario" generator that has no real equivalent yet, and Phase 1 doesn't want invented numbers next to real ones.
  - `screens/cockpit.tsx` — per-tenant-in-scope section (KPIs, facility health with the 14-day activity spark, device counts, today's schedule) plus the shared live-ops feed, off `GET /api/cockpit`.
  - `screens/customers.tsx` — list (search only, real query) and a 360 view with Overview / Subscriptions / Payments / Invoices / Timeline / Legacy tabs, off `GET /api/customers`, `/:id`, `/:id/timeline`, `/:id/legacy`.
- `App.tsx` — the same hash-router idea as the prototype (`#/cockpit`, `#/customers`, `#/customers/:id`); every other nav item renders a placeholder naming the sprint it ships in.
- `test/smoke.spec.ts` — 4 Playwright tests against the fixture-loaded database and a running API: cockpit KPIs for fxsa and fxno, customer list + 360 (including the Timeline and Legacy tabs) for fxsa, customer list for fxno. All assert zero console errors.
- `index.html` gained a real favicon (the Flexistore mark as an inline SVG `data:` URI) — its absence was producing a console-visible 404 for `/favicon.ico` that had nothing to do with the app.

**Verified against the real fixture, not just typechecked:** started the API against the same Postgres/fixture Day 1–3 used, started the Vite dev server, and drove a real Chromium (Playwright) through both screens. Confirmed with real data: Rosebank Mall's occupancy and MRR on the fxsa cockpit, Tinus Greyling / Megan Roberts / Piet Landlord / a soft-deleted account in the fxsa customer list, Ola Nordmann in the fxno list, and the Legacy tab correctly reporting "no legacy record" vs. real Zoho-sourced counts depending on the customer.

**Decisions**

- `Money` (the component) takes the API's `Money` value directly rather than a bare number + optional currency — one less place a screen can pass a major-unit number where minor units are expected.
- The tenant-scoped API client is recreated (not mutated) when the tenant changes; React Query's query keys include the client instance, so switching tenants correctly refetches everything in scope without manual cache invalidation.
- Kept the prototype's hash router rather than pulling in a routing library — Phase 1 has ~12 top-level screens and one nested detail route; not enough surface to justify the dependency yet.

**Slipped / carried over (flagged, not silently dropped)**

- **Today's schedule** shows kind + site name only. `v_schedule` (migration `0002_core.sql`) returns bare ids for customer/unit/site; the cockpit route doesn't denormalize them, and adding that is a schema/route change, not a screen-porting one. Noted in the screen itself; revisit alongside Day 5 or Sprint 2.
- **Customers list filters**: only search (`q`) is wired. The prototype's site/status/plan-size filter buttons and the Export/pagination-beyond-50 controls aren't implemented — `GET /api/customers` supports `site`/`status`/`cursor` already, so this is UI work, not an API gap.
- **Customer 360 Overview tab** drops the prototype's AI-summary card, quick-actions list, and the Xero-sync card — all of those were entirely fabricated in the mock (a hardcoded "linked to Xero contact…" string, an AI paragraph invented per customer). Real ones don't exist yet (AI summaries are Phase 5; Xero sync isn't scoped). Overview now shows only what the API actually returns: active subscription, recent messages, tags, notes, documents.
- **Invoices tab** is an explicit empty state naming Phase 2 (real invoicing is Sprint 4/5, the Money milestones) rather than the mock's five fabricated invoice rows.
- Nav badges (Inbox unread, AI proposals pending, Arrears count) removed rather than faked — no live source yet for any of them outside the cockpit's own KPIs.
- Two React Query dev-mode double-fetches per screen load (`/api/me` and `/api/cockpit` each fired twice) — confirmed via a real Chromium trace this is React 18 StrictMode's intentional double effect-invocation in development, not a real duplicate-request bug; both calls succeed and only one write reaches the query cache. Doesn't happen in a production build.
- ESLint still not configured (carried from Day 1 and Day 3).
- Playwright needed `PLAYWRIGHT_EXECUTABLE_PATH` in this sandbox (its pre-installed Chromium build doesn't match the pinned `@playwright/test`'s expected headless-shell version). The config only applies that override when the env var is set, so it's a no-op on the Mac or in CI once `playwright install` has run there.

**Acceptance**

- `pnpm typecheck` clean across the whole workspace (api, api-client, web).
- `pnpm --filter @fxpms/web build` succeeds (esbuild bundle, 229 KB / 70 KB gzip).
- `pnpm --filter @fxpms/api test`: 33/33 still green (unaffected by this day's work).
- `pnpm --filter @fxpms/web test` (Playwright): 4/4 green against the real fixture-loaded database and a running API — not a mocked one.
- Manual: both screens screenshotted mid-session with real data visible; tenant switcher confirmed to change currency (R → kr) and dataset live in the browser.
