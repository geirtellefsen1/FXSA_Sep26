# Day 3 — Read API for the Phase 1 screens

**Shipped**

All Day 3 endpoints per `docs/07-SPRINTS.md`, every one tenant-scoped through `req.scoped()`, keyset-paginated where listed, money as `{ amount_minor, currency }`, timestamps ISO UTC:

- `GET /api/cockpit` — per-tenant-in-scope KPIs (`v_cockpit_kpis`), site health (`v_site_occupancy` + a spark), today's schedule (`v_schedule`), last-hour activity feed. `proposals`/`incident` are the Phase 4/5 empty states.
- `GET /api/sites`, `/api/sites/:id`, `/api/sites/:id/units`, `/api/units/:id` — list with occupancy/MRR/device counts, detail bundle (zones, unit types, agreements, landlord), unit detail with its hub/gateway/lock links and current subscription.
- `GET /api/customers`, `/api/customers/:id` (360 bundle), `/api/customers/:id/timeline`, `/api/customers/:id/legacy`.
- `GET /api/subscriptions`, `GET /api/payments` — filterable lists.
- `GET /api/leads`, `/api/leads/:id`, `GET /api/arrears` (from `v_arrears`).
- `GET /api/devices/sites`, `/api/devices/sites/:siteId` (gateway→hub→lock tree), `/api/devices/:id`.
- `GET /api/import/runs`, `/api/import/runs/:id/checks`, `/api/import/modules`, `/api/import/market-sources`.

Shared building blocks: `lib/pagination.ts` (keyset cursors — correct under concurrent writes, unlike OFFSET), `lib/money.ts`, `lib/refs.ts`, `lib/errors.ts`. `Db`'s type parsers extended to convert `timestamptz` → ISO string and keep `date` as raw text (avoids a timezone-shift bug converting dates through JS `Date`).

`packages/api-client`: hand-written typed fetch client (`FxApiClient`) + response types, matching every endpoint above. Verified against a live server with real HTTP calls (not just typechecked), including a full customer 360 round-trip.

**Tests.** `apps/api/test/day3.test.ts`, 24 new tests (33 total with Day 1's) against the fixture database: every endpoint's happy path, filters (status/stage), 404s on unknown ids, and — critically — RLS checks confirming an fxno-scoped request cannot reach an fxsa site, unit, or customer, whether through a list or a direct detail lookup by id (a detail 404s rather than leaking existence).

**Bugs found and fixed while building (not carried over — fixed now):**

1. Cockpit and site-list queries returned `count(*)` and other bigint aggregates as strings (the Day 1 `Db` type-parser override for `int8`), but the Zod response schemas declared them as `number` — every list with a count silently 500'd until each was wrapped in `Number(...)`.
2. `sites.ts`'s list query selected `currency` from the wrong table alias (`v_site_occupancy` doesn't carry it; `sites` does) — `/api/sites` 500'd until fixed.
3. `/api/devices/sites`' per-status device counts weren't scoped to the same `kind in ('udm','gateway','hub')` filter as the total, so locks (which default to `status='unknown'`) inflated the `unknown` count above the total. Fixed so `good+watch+bad+unknown = total` always — asserted in the test.
4. `/api/customers/:id/legacy` issued three `Promise.all`'d queries on one shared `PoolClient` — node-postgres queues concurrent queries on a single client and emits a deprecation warning for it (removal planned in pg 9). Changed to sequential awaits.

**Decisions**

- Keyset (seek) pagination, not offset: every list orders by a real column plus a unique id tiebreaker; the cursor is an opaque base64url JSON tuple. Correct under concurrent inserts, which matters once the real backup (and later the delta sync) is loaded.
- `import.runs`/`import.checks` have no `tenant_id` and so no RLS — confirmed by inspecting the live schema, not assumed. Documented in the route file and below as a carried-over gap, not silently shipped.

**Slipped / carried over**

- `spark_14d` on the cockpit's site health is a **daily count of `unit.status_changed` activity events**, not a reconstructed occupancy-over-time series. The event payload's `from`/`to` are the *Zoho* status strings (e.g. `RESERVED_PAID`), not the core `unit_status` enum, so a true occupancy replay needs a status-vocabulary map that doesn't exist yet. Documented in `routes/cockpit.ts`. Revisit once real data makes the distinction matter (the fixture has only 3 status-change events total, too few to judge from).
- `/api/import/*` is readable by any authenticated user regardless of role — there's no role gate yet (writes and roles are Sprint 2 Day 6/8). Flagged in the route file's own comment; the fix is a straightforward role check once `staff_role` gating exists elsewhere.
- Keyset pagination on `/api/payments` assumes a non-null `received_at` cursor value; a page boundary landing on a null-`received_at` row would break the next page's predicate. Not hit by the fixture (every payment has it); noted in the code, worth confirming once real data is loaded.
- ESLint still not configured (from Day 1's carry-over) — ported forward to Day 4.
- Timings against real data (target < 2 s) can't be measured yet — no real data is loaded in this environment. This is explicitly a Day 3 task item for *when run on the Mac against the real load*; re-run `curl -w '%{time_total}'` against `/api/customers?q=` and `/api/customers/:id` once Day 2 completes.

**Acceptance**

- `pnpm typecheck` clean across the whole workspace (api, api-client).
- `pnpm test` (apps/api): 33/33 passing, including RLS coverage for every list-plus-detail pair.
- `tools/zoho-import/tests/test_e2e.py`: unaffected, still green (97 checks, 0 failed).
- Manual smoke: every endpoint curled directly against a running server with real fixture data and inspected; the api-client's typed methods exercised end-to-end over real HTTP, not just typechecked.
