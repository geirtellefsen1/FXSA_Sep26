# Phase 1 — Sprint 1 and Sprint 2, cut into day-sized Claude Code sessions

Two sprints of five "days". A day is one Claude Code session of roughly 1.5–2 hours that ends in a green commit. Sprint 1 fits about ten hours of budget. Sprint 2 is planned to the same level so it can start the moment Sprint 1 ends, but its prompts will be refined with what Sprint 1 learned.

The real Zoho backup is on a Mac that Claude Code on the web cannot see. Every day therefore builds and tests against the synthetic fixture and a local Postgres; the real-data load is a CoWork task that runs in parallel (Day 5) and again on staging (Day 9).

Stack (decision D16 in `06-DECISIONS.md`): pnpm workspace with `apps/api` (Fastify, node-postgres, Zod, vitest) and `apps/web` (Vite, React, TypeScript, TanStack Query, Playwright). Postgres 16 in Docker locally.

---

## How to run a day

1. Open a fresh Claude Code session on the repository, branch `claude/flexistore-pms-multitenant-yfu2hj` (or a branch per day, merged back at the end).
2. Paste the day's prompt verbatim. It tells the session what to read first.
3. Commit at every deliverable, not only at the end. Use the commit-message style already on the branch.
4. The last fifteen minutes of a day are for the acceptance checks and `docs/sprints/day-N.md`: what shipped, what slipped, decisions taken, anything to carry over.
5. Stop rule: when the budget is spent, stop at the last green commit. Put the remainder under "Carried over" in the day log; the next day's prompt starts by reading it.
6. Never change a migration that has already been applied to real data; add a new numbered file. Never change the importer's header contracts without re-running `tools/zoho-import/tests/test_e2e.py`.

---

# Sprint 1 — the console runs on real data

Outcome: a runnable local stack; the Phase 1 screens fed by the API; CRM writes with audit; the real backup loaded once on a local Postgres with a reviewed reconciliation.

## Day 1 — Runtime and API skeleton

**Goal.** Anyone can run the whole stack locally with three commands, and the API answers with tenant scope enforced by the database.

**Inputs.** `db/`, `tools/zoho-import/`, `docs/02-DATA-MODEL.md` §1 and §5, `ux/prototype/MEMO.md` (Conventions, Cross-cutting: Auth).

**Tasks.**
1. `docker-compose.yml` with Postgres 16 (volume, port 5432, `POSTGRES_DB=fxpms`), and a `Makefile`: `up`, `down`, `db:apply` (runs `db/apply.sh`), `import:fixture` (generates the fixture and runs `zoho-import run`), `test`, `dev`.
2. pnpm workspace (`package.json`, `pnpm-workspace.yaml`, root `tsconfig.base.json`, eslint + prettier). Node 22.
3. `apps/api`: Fastify 5, `pg` pool, Zod. Request lifecycle: read `X-Dev-User` (email) and `X-Tenant` (slug or `all`) in development; resolve the user's `tenant_memberships`; open a transaction per request and run `set local app.tenant_ids = …; set local app.user_id = …` before any query; reject a tenant the user is not a member of with 403. Structured logs with a request id; `X-Request-Id` on every response.
4. Endpoints: `GET /health`, `GET /api/me` (user, memberships, selected tenant with currency/locale/timezone), `GET /api/openapi.json` (generated from the Zod schemas via `fastify-zod-openapi` or `@fastify/swagger`).
5. Database roles for the app: a login user `app_user` that inherits `app` (no BYPASSRLS) created by `db/migrations/0006_app_roles.sql` with the password taken from an environment variable at apply time (document it); the importer keeps using the superuser locally.
6. `apps/api/test`: vitest with a DB fixture helper that applies migrations to a scratch database and runs the importer fixture; tests: `/api/me` for `geir@flexistore.no` returns three tenants; `/api/me` with `X-Tenant: fxno` for `adam@flexistore.co.za` (fxsa admin only) returns 403; a query through the pool scoped to fxno returns zero fxsa customers.
7. GitHub Actions workflow: services Postgres 16; steps: `db/apply.sh`, importer e2e, `pnpm test`.

**Deliverables.** The files above; `docs/sprints/day-1.md`.

**Acceptance.** `make up && make db:apply && make import:fixture && make dev` then `curl -H 'X-Dev-User: geir@flexistore.no' localhost:3000/api/me` returns the tenants; `pnpm test` green locally and in CI.

**Prompt.**

```
You are continuing Phase 1 of the Flexistore multi-tenant PMS in this repository, branch claude/flexistore-pms-multitenant-yfu2hj.
Read first: README.md, docs/07-SPRINTS.md (Day 1 only), docs/02-DATA-MODEL.md §1 and §5, db/migrations/0005_rls.sql, tools/zoho-import/README.md, ux/prototype/MEMO.md sections "Conventions" and "Cross-cutting: Auth, roles, audit".
Do Day 1 exactly as specified in docs/07-SPRINTS.md: docker-compose + Makefile, pnpm workspace, apps/api (Fastify 5, pg, Zod) with per-request RLS scoping via set local app.tenant_ids / app.user_id inside a transaction, dev auth headers X-Dev-User and X-Tenant, /health, /api/me, /api/openapi.json, migration 0006_app_roles.sql, vitest tests against a scratch database loaded with the importer fixture, and a GitHub Actions workflow.
Rules: TypeScript strict; no ORM; SQL in tagged template files or plain strings; every query runs inside the scoped transaction; no secrets in the repo. Commit at each deliverable with the commit style already on the branch. Finish with docs/sprints/day-1.md (shipped, slipped, decisions, carried over) and push. Stop at the last green commit if you run out of budget.
```

## Day 2 — Read API for the Phase 1 screens

**Goal.** Every Phase 1 screen has its data available through the memo's endpoints, tenant-scoped, paginated, typed.

**Inputs.** `ux/prototype/MEMO.md` (the "Data needed" / "Endpoints" blocks per screen), `docs/05-UX-PHASE-1.md` §2, `db/migrations/0002_core.sql` (views `v_cockpit_kpis`, `v_site_occupancy`, `v_schedule`, `v_arrears`), `docs/01-PHASE-1.md` §4.

**Tasks.**
1. Read endpoints (all `GET`, all under `/api`, all scoped):
   - `/cockpit` → `v_cockpit_kpis` for the selected tenant (or one row per tenant when `all`), `site_health` from `v_site_occupancy` with a 14-day occupancy spark computed from `activity_log` `unit.status_changed`, `schedule_today` from `v_schedule`, `live_feed` = last hour of `activity_log`, `proposals` and `incident` empty.
   - `/sites`, `/sites/:id` (site, zones, unit_types, agreements, landlord, device counts), `/sites/:id/units`, `/units/:id`.
   - `/customers?q=&site=&status=&page=` (search across name, email, phone, account number), `/customers/:id` (360 bundle: customer, subscriptions with unit and site, last 10 payments, recent messages, tags, notes, documents), `/customers/:id/timeline?from=&to=&kind=`, `/customers/:id/legacy` (the `legacy.contacts` row plus related legacy-only rows).
   - `/subscriptions?status=&site=&customer=`, `/payments?status=&from=&to=&customer=`.
   - `/leads?stage=&site=&q=`, `/leads/:id`.
   - `/arrears` → `v_arrears` joined to customer and unit.
   - `/devices/sites`, `/devices/sites/:siteId`, `/devices/:id` (children).
   - `/import/runs`, `/import/runs/:id/checks`, `/import/modules` (row counts per staging table, legacy table and core table), `/import/market-sources` (distribution of `market_source` per legacy table).
2. Cursor pagination (`?limit=&cursor=`) on every list; `en-ZA`/`nb-NO` never in the API: money as `{ amount_minor, currency }`, times as ISO UTC.
3. Zod response schemas → OpenAPI; a generated TypeScript client (`packages/api-client`) for the web app.
4. Tests: each endpoint against the fixture (known ids in `tools/zoho-import/tests/make_fixture.py`), plus an RLS test per list endpoint (fxno scope never returns an fxsa row).

**Acceptance.** `pnpm test` green; `/api/openapi.json` lists every endpoint above; `curl` of `/api/customers/:id` for Tinus Greyling returns his subscription, the settled payment and the `lock.unlock` timeline entry.

**Prompt.**

```
Continue Phase 1 on branch claude/flexistore-pms-multitenant-yfu2hj. Read first: docs/sprints/day-1.md, docs/07-SPRINTS.md (Day 2), ux/prototype/MEMO.md (every "Data needed"/"Endpoints" block), docs/05-UX-PHASE-1.md §2, db/migrations/0002_core.sql (the views at the end), tools/zoho-import/tests/make_fixture.py (known ids).
Implement the Day 2 read API exactly as listed: tenant-scoped, cursor-paginated, Zod-typed, OpenAPI-documented, with a generated TypeScript client in packages/api-client. Money is { amount_minor, currency }; times are ISO UTC. Write vitest tests per endpoint against the fixture and an RLS test per list endpoint.
Commit per endpoint group. Finish with docs/sprints/day-2.md and push.
```

## Day 3 — Web app on the API, part 1

**Goal.** The prototype becomes a Vite application whose Cockpit and Customers screens show API data for whichever tenant is selected.

**Inputs.** `ux/prototype/` (tokens.css, components.jsx, tenants.jsx, shell.jsx, screens/cockpit.jsx, screens/customers.jsx), `docs/05-UX-PHASE-1.md` §1, §2, §4, `packages/api-client`.

**Tasks.**
1. `apps/web`: Vite + React 18 + TypeScript; `tokens.css` copied; `components.jsx` ported to TSX one component at a time (Btn, Badge, Avatar, Card, Kpi, Money, Spark, Tabs, Modal, Empty, HeatStrip, Donut, SevDot, ChannelChip); icons ported; shell (sidebar, topbar, tenant switcher, hash or React Router routes).
2. Data layer: TanStack Query; a client that sends `X-Tenant` from the tenant context and `X-Dev-User` in development; `Money` takes `{ amount_minor, currency }`.
3. Cockpit on `/api/cockpit`: KPIs, site heat strip with spark, schedule, live feed; AI proposes and incident banner as empty states naming Phase 5 / Phase 4.
4. Customers list on `/api/customers` with search and filters; Customer 360 with Overview, Subscriptions, Payments (new tab), Timeline (icon by action family), Legacy (Zoho) tab; Invoices tab empty state naming Phase 2; Documents and Notes read-only for now.
5. Delete the mock generators for the ported screens (`data.jsx` entries they used). Other screens stay on mock data until Day 4 and are marked in the sidebar with a small "mock" badge.
6. Playwright: cockpit and customer 360 render fixture data for fxsa and for fxno (tenant switch), no console errors.

**Acceptance.** `make dev` serves API and web; switching the tenant re-fetches and re-renders with the right currency; Playwright green.

**Prompt.**

```
Continue Phase 1 on branch claude/flexistore-pms-multitenant-yfu2hj. Read first: docs/sprints/day-2.md, docs/07-SPRINTS.md (Day 3), docs/05-UX-PHASE-1.md, ux/prototype/tokens.css, ux/prototype/components.jsx, ux/prototype/tenants.jsx, ux/prototype/shell.jsx, ux/prototype/screens/cockpit.jsx, ux/prototype/screens/customers.jsx, packages/api-client.
Create apps/web (Vite, React 18, TypeScript, TanStack Query, Playwright) and port the shell, the component library and the Cockpit and Customers screens onto the API, exactly as Day 3 specifies. Keep the prototype's look pixel-close: same tokens, same layout, same copy. Money renders from { amount_minor, currency }. Empty states name the phase. Delete the mock data the ported screens used.
Commit per screen. Finish with docs/sprints/day-3.md and push.
```

## Day 4 — Web app on the API, part 2

**Goal.** Every Phase 1 route renders API data; every later-phase surface has its empty state.

**Inputs.** `ux/prototype/screens/*.jsx` (facilities, billing, arrears, leads, devices, reports, migration, inbox, corporate, ai), `docs/05-UX-PHASE-1.md` §2.

**Tasks.**
1. Facilities: list cards from `/api/sites` + occupancy; detail with Units table (Edit opens a read-only modal for now), Tech issues tab (read; create arrives Day 5), Devices tab, Landlord & contract, Legacy tab. Floor plan: a simple grid renderer over the default zone coloured by unit status.
2. Subs & invoices: Subscriptions and Payments tabs live; Invoices and Pricing tabs empty naming Phase 2 (Pricing shows `price_history` if present).
3. Arrears: open table from `/api/arrears`; actions disabled with phase notes; other tabs empty.
4. Leads: kanban from `/api/leads` (read-only drag for now); modal Detail/Conversation/Activity read-only.
5. Devices: L0 sites grid → L1 site gateways → L2 boards → L3 locks from the device tree; no actions.
6. Reports: headline KPIs, MRR 12 months (subscriptions active per month), occupancy per site from `unit.status_changed` history; other sections empty.
7. Migration: runs, checks, modules, tenant derivation from `/api/import/*`; source-of-record toggle disabled until Sprint 2.
8. Inbox, Corporate, AI activity: empty states per `docs/05-UX-PHASE-1.md`.
9. Remove the remaining mock data; remove the "mock" badges; Playwright smoke test of every route for fxsa and fxno.

**Acceptance.** No screen reads `window.FXDATA`; Playwright smoke green; `pnpm build` produces a static bundle.

**Prompt.**

```
Continue Phase 1 on branch claude/flexistore-pms-multitenant-yfu2hj. Read first: docs/sprints/day-3.md, docs/07-SPRINTS.md (Day 4), docs/05-UX-PHASE-1.md §2, and the prototype screens for facilities, billing, arrears, leads, devices, reports, migration, inbox, corporate and ai under ux/prototype/screens.
Port the remaining screens onto the API exactly as Day 4 lists, with the empty states naming their phase. Remove all mock data. Add a Playwright smoke test that visits every route for fxsa and fxno and fails on any console error.
Commit per screen. Finish with docs/sprints/day-4.md and push.
```

## Day 5 — CRM writes, roles, and the first real-data load

**Goal.** Operators can do their daily CRM work in the console, every write is audited, and the real backup has been loaded once with a reviewed reconciliation.

**Inputs.** `ux/prototype/MEMO.md` (Notes, Activity log, Auth sections), `docs/01-PHASE-1.md` M4, `docs/04-COWORK-EXPORT-RUNBOOK.md`.

**Tasks (Claude Code).**
1. Write endpoints with `Idempotency-Key`: `POST /api/notes`, `POST/DELETE /api/customers/:id/tags`, `PATCH /api/customers/:id` (name, email, phone, address, marketing opt-out), `POST /api/customers/:id/suspend` and `/reactivate` (flag + activity), `POST /api/facilities/:id/tickets`, `PATCH /api/tickets/:id/status`, `POST /api/leads/:id/stage` (with loss reason), `PATCH /api/units/:id` (notes, maintenance flag with reason). Each writes `audit_log` (before/after) and `activity_log` inside the same transaction.
2. Role gate: `viewer` read-only; `operator` and above may write; `admin`/`super_admin` for suspend and unit status. 403 with a clear message.
3. Web: Add note (Cmd+N), tag picker, customer edit form, suspend/reactivate, ticket create/update, lead stage picker with the Lost dropdown, unit maintenance toggle. Activity tabs refresh after a write.
4. Tests for each write: audit and activity rows exist, role gate enforced, idempotency replay returns the first result.

**Task (CoWork, in parallel, on the Mac).** Follow `docs/04-COWORK-EXPORT-RUNBOOK.md` Contract A against a local Docker Postgres (`docker compose up`, `db/apply.sh`, then `zoho-import run --root "…/Data_001 (1)" --expect-full-backup`). Add `aliases.json` for every `missing_required` and for `fill` warnings that are label mismatches. Hand back `manifest.json`, the run output, `reconciliation.txt`, `aliases.json`. Any check that still fails goes into `docs/sprints/day-5.md` as a Sprint 2 Day 6 item.

**Acceptance.** A note added in the UI appears in the customer's Activity tab and in `audit_log` with the acting user; a `viewer` gets 403 on every write; the real-data reconciliation has zero `error` checks or a triaged list.

**Prompt (Claude Code).**

```
Continue Phase 1 on branch claude/flexistore-pms-multitenant-yfu2hj. Read first: docs/sprints/day-4.md, docs/07-SPRINTS.md (Day 5), ux/prototype/MEMO.md sections "Cross-cutting: Notes", "Cross-cutting: Activity log", "Cross-cutting: Auth, roles, audit", docs/01-PHASE-1.md milestone M4.
Implement the Day 5 write endpoints with Idempotency-Key, audit_log + activity_log in the same transaction, the role gate, and the corresponding UI actions. Write tests for audit rows, role gates and idempotent replay.
Commit per endpoint group. Finish with docs/sprints/day-5.md, including the "Carried over" list and the real-data reconciliation results handed back by CoWork if available, and push.
```

**Prompt (CoWork).**

```
Load the Zoho backup into a local Flexistore PMS database following docs/04-COWORK-EXPORT-RUNBOOK.md, Contract A. Steps: docker compose up -d (repository root), DSN=postgresql://fx:fx@localhost:5432/fxpms db/apply.sh, cd tools/zoho-import && pip install -e ., zoho-import manifest --root "<path to zoho backup/Data_001 (1)>", then zoho-import --dsn postgresql://fx:fx@localhost:5432/fxpms run --root "<same path>" --expect-full-backup. For every preflight "missing_required" and every validate "fill … 0%" warning, find the actual header in manifest.json and add an alias to aliases.json (see tools/zoho-import/README.md), then re-run stage --aliases aliases.json and transform. Hand back manifest.json, the console output, reconciliation.txt (query in the runbook §2 step 4) and aliases.json. Do not edit any CSV. Do not load into a hosted database.
```

---

# Sprint 2 — ready for the parallel run

Outcome: Zoho and the PMS stay in sync; real logins; the remaining read surfaces; a staging environment with the real data; a go/no-go for the parallel run (M5).

## Day 6 — Zoho delta sync

**Goal.** Changes in Zoho reach `legacy.*` and `public.*` within an hour, idempotently.

**Tasks.**
1. `tools/zoho-sync` (Python, same package as the importer): OAuth client for Zoho CRM; per-module Bulk Read jobs (`Price_Books`, `Products`, `Contacts`, `Sales_Orders`, `Payment_Details`, `Payments`, `AppEvents`, `Communications`, `Gateways`, `Leads`, `Calls`, `Notes`, `Tasks`, `bulksmscom__SMSes`, `OfferRequests`, `Property_Agreements`, `Business_Partners`) with criteria `Modified_Time > cursor`; download CSV results; `stage --append` into the same `zoho_raw` tables (header check against the initial load).
2. Transforms in upsert mode: introduce `{{MODE}}` (`reload` | `upsert`) in the transform files; in upsert mode the legacy transforms use `on conflict (zoho_id) do update` and the core transforms upsert on `(tenant_id, source, source_ref)`; no truncates. Keep the e2e test green in both modes.
3. Nightly id sweep per module (list of `Record Id`s via Bulk Read without criteria) → soft-delete rows whose id disappeared (`deleted_at`, activity entry).
4. Cursor per module in `import.runs.summary`; a worker in `apps/api` schedules the hourly run and the nightly sweep; Migration screen shows last sync, backlog, per-module cursor.
5. Tests: fixture-based upsert test (a second run with a changed row updates, not duplicates).

**Acceptance.** Two consecutive syncs against the fixture (with an edited row) leave exactly one updated row; the Migration screen shows the run.

## Day 7 — Auth, roles, staff

**Goal.** Real logins replace the development headers.

**Tasks.** Magic-link login (email) + TOTP enrolment/verification; server sessions (httpOnly cookie); `tenant_memberships` → `app.tenant_ids`; role gates already in place become the only path; staff management screen (invite, role per tenant, disable); audit viewer (filterable timeline of `audit_log`); POPIA subject-data export endpoint (`GET /api/customers/:id/export` → JSON of everything about the customer, audited); rate limits on login.

**Acceptance.** Development headers are ignored outside `NODE_ENV=development`; an operator cannot open staff management; an export is recorded in `audit_log`.

## Day 8 — Inbox read-only, Legacy browser, reports

**Goal.** The remaining read surfaces of Phase 1.

**Tasks.** `/api/inbox` and `/api/inbox/:id` over conversations/messages (imported history); Inbox screen read-only with the right rail live; Legacy (Zoho) tab on customer, site and unit (all related legacy-only rows) and the Migration screen's legacy browser (table browser over `legacy.*` with search by Zoho id, name, email); Reports: churn/new from `subscription.*` events, per-site trends, the daily 06:30 digest as a saved report sent by the worker (email adapter stub that logs in development).

**Acceptance.** A customer's imported emails, SMS and calls show as one thread; the legacy browser finds a property prospect by name; the digest job runs on schedule locally.

## Day 9 — Hosting and data

**Goal.** A staging environment with the real data.

**Tasks.** Provision managed Postgres 16 and S3-compatible object storage (provider per decision O10); deploy `apps/api` and `apps/web` (container images, one region); secrets from the platform's secret store; TLS; backups and WAL retention; observability (request ids in logs, error tracking, job failure alerts); attachments re-host job reading `documents.local_path`, uploading, setting `storage_key`, serving via short-lived signed URLs; CoWork or an operator runs Contract A against staging; a `README` section "Environments".

**Acceptance.** `zoho-import validate --expect-full-backup` on staging has zero errors; the console on staging opens a customer 360 with a document link that works.

## Day 10 — Parallel-run readiness

**Goal.** A go/no-go for M5.

**Tasks.** Performance on the full dataset: customer list, customer 360 with timeline, cockpit under 2 s (indexes, query plans, pagination fixes as needed); market-default review tool (list customers with `market_source = 'default'`, reassign to another tenant with dependants, audited); UAT checklist per screen filled by one FXSA and one FXNO operator; delta sync running hourly on staging for 48 hours with backlog tracking; go/no-go note in `docs/sprints/day-10.md`.

**Acceptance.** All three timings under 2 s; the reassign tool moves a fixture customer between tenants with the subscription and payments following; UAT checklist signed.

---

## Carry-over and re-planning

After Day 5, re-read Sprint 2 with the day logs and the real-data reconciliation in hand. Expect Day 6 to absorb whatever the first real load revealed (aliases that need code, market-derivation surprises), and Day 9 to depend on the hosting decision (O10). Nothing in Sprint 2 depends on Sprint 1 screens being perfect; it depends on the API contracts and the importer being stable, which Day 2 and Day 5 lock down.
