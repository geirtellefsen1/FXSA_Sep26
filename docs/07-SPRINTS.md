# Phase 1 — Sprint 1 and Sprint 2, cut into day-sized Claude Code sessions

Two sprints of five "days". A day is one Claude Code session of roughly 1.5–2 hours that ends in a green commit. Sprint 1 fits about ten hours of budget. Sprint 2 is planned to the same level so it can start the moment Sprint 1 ends, but its prompts will be refined with what Sprint 1 learned.

**Order of Sprint 1: runtime, then the real import, then screens on the real data.** The Zoho backup is on a Mac that Claude Code on the web cannot see, so Day 2 runs there with Claude CoWork against the local Docker Postgres that Day 1 set up. From Day 3 on, every screen is built against the real data (the synthetic fixture stays for automated tests).

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

# Sprint 1 — the real data in, the console on top of it

Outcome: a runnable local stack; the real backup loaded and reconciled on your Mac; the Phase 1 screens fed by the API from that data.

## Day 1 — Runtime and API skeleton — **done** (`docs/sprints/day-1.md`)

`docker-compose.yml`, `Makefile`, pnpm workspace, `apps/api` with per-request RLS scope, `/health`, `/api/me`, `/api/openapi.json`, `0006_app_roles.sql`, tests, CI. This is what the import day needs.

## Day 2 — Import day (on your Mac, with CoWork; Claude Code on standby)

**Goal.** The full Zoho backup is loaded into the local Postgres on the Mac, the reconciliation is reviewed, and every header mismatch has an alias or a code fix committed.

**Who does what.** CoWork runs the load (it has the files). A Claude Code session on the repository handles anything that needs a code change (a transform that must read a different column, a market rule that misfires) and commits it. You review the market-derivation distribution and the `default` list.

**Steps on the Mac.**
1. `git pull` the branch; Docker Desktop running; `make up && make db-apply`. Sanity: `psql postgresql://fx:fx@localhost:5432/fxpms -c 'select slug from tenants'` shows fxsa, fxno, fxfi.
2. `cd tools/zoho-import && pip install -e .` (Python 3.11+).
3. Paste the CoWork prompt below. CoWork produces `manifest.json`, the run output, `reconciliation.txt`, `aliases.json`.
4. If preflight reports `missing_required` that no alias can satisfy (the column genuinely does not exist in the export), paste the report into Claude Code with the Day 2 prompt below; it changes the transform, re-runs the fixture e2e, commits; CoWork re-runs `transform`.
5. Review: `Migration` numbers are not in the UI yet, so use SQL: `select market_source, count(*) from legacy.contacts group by 1;` and `select count(*) from customers where flags ? 'deleted_app_account';`. Spot-check five customers you know across fxsa and fxno.
6. Commit `aliases.json` (it is configuration, not data) and `docs/sprints/day-2.md` with the reconciliation summary.

**Acceptance.** `zoho-import validate --expect-full-backup` on the real data: zero `error` checks; every `warn` either accepted with a note or fixed; `market_source = 'default'` share per table recorded; the five spot-checked customers correct.

**Prompt (CoWork, on the Mac).**

```
Load the Zoho backup into the local Flexistore PMS database following docs/04-COWORK-EXPORT-RUNBOOK.md, Contract A. The database is already running (make up && make db-apply were run): DSN postgresql://fx:fx@localhost:5432/fxpms.
Steps: cd tools/zoho-import; zoho-import manifest --root "<path to zoho backup/Data_001 (1)>"; then zoho-import --dsn postgresql://fx:fx@localhost:5432/fxpms run --root "<same path>" --expect-full-backup.
For every preflight "missing_required" and every validate "fill … 0%" warning, find the actual header in manifest.json (files[].header / files[].columns), add an alias to aliases.json as described in tools/zoho-import/README.md, and re-run: zoho-import --dsn … stage --root "<path>" --aliases aliases.json, then zoho-import --dsn … transform, then zoho-import --dsn … validate --manifest "<path>/manifest.json" --expect-full-backup.
If a required column truly does not exist in the export, stop and report the exact preflight lines; do not invent an alias.
Hand back: manifest.json, the full console output, reconciliation.txt (query in the runbook §2 step 4), aliases.json, and the output of: select market_source, count(*) from legacy.contacts group by 1 order by 2 desc.
Do not edit any CSV. Do not load into any hosted database.
```

**Prompt (Claude Code, only if CoWork reports something aliases cannot fix).**

```
Continue on branch claude/flexistore-pms-multitenant-yfu2hj. Read docs/sprints/day-1.md, docs/07-SPRINTS.md (Day 2), tools/zoho-import/README.md and docs/03-ZOHO-IMPORT-SPEC.md §2.
CoWork ran the real Zoho backup through zoho-import and reports the following preflight/validate lines: <paste>. For each, decide whether the fix is an alias (tell me the alias) or a transform change (make it: adjust the -- requires/optional contract and the SQL, keep every source column in extra jsonb, re-run tools/zoho-import/tests/test_e2e.py, commit with a message naming the Zoho label involved). Do not guess labels: use the headers from the pasted manifest.json excerpt.
```

## Day 3 — Read API for the Phase 1 screens, against the real data

**Goal.** Every Phase 1 screen has its data through the memo's endpoints, tenant-scoped, paginated, typed; verified against the real load on the Mac as well as the fixture in tests.

**Inputs.** `ux/prototype/MEMO.md` ("Data needed" / "Endpoints" blocks), `docs/05-UX-PHASE-1.md` §2, the views at the end of `db/migrations/0002_core.sql`, `docs/sprints/day-2.md` (what the real data looks like).

**Tasks.**
1. Read endpoints (all `GET`, under `/api`, all through `req.scoped()`):
   - `/cockpit` → `v_cockpit_kpis` (one row per tenant in scope), `site_health` from `v_site_occupancy` with a 14-day occupancy spark from `activity_log` `unit.status_changed`, `schedule_today` from `v_schedule`, `live_feed` = last hour of `activity_log`; `proposals` and `incident` empty.
   - `/sites`, `/sites/:id` (site, zones, unit types, agreements, landlord, device counts), `/sites/:id/units`, `/units/:id`.
   - `/customers?q=&site=&status=&limit=&cursor=` (search across name, email, phone, account number), `/customers/:id` (360 bundle), `/customers/:id/timeline?from=&to=&kind=`, `/customers/:id/legacy`.
   - `/subscriptions?status=&site=&customer=`, `/payments?status=&from=&to=&customer=`.
   - `/leads?stage=&site=&q=`, `/leads/:id`; `/arrears`; `/devices/sites`, `/devices/sites/:siteId`, `/devices/:id`.
   - `/import/runs`, `/import/runs/:id/checks`, `/import/modules`, `/import/market-sources`.
2. Cursor pagination on every list; money as `{ amount_minor, currency }`; times ISO UTC.
3. Zod response schemas → OpenAPI; generated TypeScript client in `packages/api-client`.
4. Tests per endpoint on the fixture (known ids in `tools/zoho-import/tests/make_fixture.py`) and an RLS test per list endpoint.
5. On the Mac, after pulling: `make api` and `curl` the customer 360 of a real customer; timings for `/customers?q=` and `/customers/:id` recorded in the day log (target under 2 s).

**Prompt.**

```
Continue Phase 1 on branch claude/flexistore-pms-multitenant-yfu2hj. Read first: docs/sprints/day-1.md, docs/sprints/day-2.md, docs/07-SPRINTS.md (Day 3), ux/prototype/MEMO.md (every "Data needed"/"Endpoints" block), docs/05-UX-PHASE-1.md §2, the views at the end of db/migrations/0002_core.sql, apps/api/src (the scope plugin and /api/me are the pattern to follow), tools/zoho-import/tests/make_fixture.py (known ids).
Implement the Day 3 read API exactly as listed: every query through req.scoped(), cursor pagination, Zod 4 schemas, OpenAPI, generated TypeScript client in packages/api-client, vitest per endpoint against the fixture plus an RLS test per list endpoint. Money is { amount_minor, currency }; times are ISO UTC.
Commit per endpoint group. Finish with docs/sprints/day-3.md and push.
```

## Day 4 — Web app on the API, part 1 (shell, Cockpit, Customers)

As previously specified: Vite + React + TypeScript + TanStack Query; tokens and components ported; tenant switcher sends `X-Tenant`; Cockpit and Customers list + 360 (Overview, Subscriptions, Payments, Timeline, Legacy tab; Invoices empty naming Phase 2); mock data removed for these screens; Playwright renders fixture data for fxsa and fxno. On the Mac: open the console against the real load and record what looks wrong in the day log.

**Prompt.**

```
Continue Phase 1 on branch claude/flexistore-pms-multitenant-yfu2hj. Read first: docs/sprints/day-3.md, docs/07-SPRINTS.md (Day 4), docs/05-UX-PHASE-1.md, ux/prototype/tokens.css, ux/prototype/components.jsx, ux/prototype/tenants.jsx, ux/prototype/shell.jsx, ux/prototype/screens/cockpit.jsx, ux/prototype/screens/customers.jsx, packages/api-client.
Create apps/web (Vite, React 18, TypeScript, TanStack Query, Playwright) and port the shell, the component library, Cockpit and Customers onto the API. Keep the prototype's look pixel-close. Money renders from { amount_minor, currency }. Empty states name their phase. Delete the mock data these screens used.
Commit per screen. Finish with docs/sprints/day-4.md and push.
```

## Day 5 — Web app on the API, part 2 (all remaining Phase 1 screens)

As previously specified: Facilities (list, units table, tech issues read, devices, landlord & contract, legacy tab, simple grid floor plan), Subs & payments (Invoices/Pricing empty), Arrears (read), Leads kanban (read), Devices inventory, Reports (occupancy from history, MRR), Migration (runs, checks, modules, tenant derivation from `/api/import/*`), empty states for Inbox, Corporate, AI. Remaining mock data removed; Playwright smoke of every route for fxsa and fxno. On the Mac: walk every screen on the real data with one FXSA and one FXNO operator and list findings in the day log; that list opens Sprint 2.

**Prompt.**

```
Continue Phase 1 on branch claude/flexistore-pms-multitenant-yfu2hj. Read first: docs/sprints/day-4.md, docs/07-SPRINTS.md (Day 5), docs/05-UX-PHASE-1.md §2, and the prototype screens for facilities, billing, arrears, leads, devices, reports, migration, inbox, corporate and ai under ux/prototype/screens.
Port the remaining screens onto the API with the empty states naming their phase. Remove all mock data. Add a Playwright smoke test that visits every route for fxsa and fxno and fails on any console error.
Commit per screen. Finish with docs/sprints/day-5.md, including the operator walk-through findings if available, and push.
```

---

# Sprint 2 — operators can work in it, and it stays in sync

Outcome: CRM writes with audit; Zoho and the PMS in sync; real logins; the remaining read surfaces; a staging environment; a go/no-go for the parallel run (M5).

## Day 6 — CRM writes and roles

`POST /api/notes`, tags, `PATCH /api/customers/:id`, suspend/reactivate, tech tickets create/update, `POST /api/leads/:id/stage` with loss reason, unit maintenance flag; each with `Idempotency-Key`, `audit_log` (before/after) and `activity_log` in the same transaction; role gate (`viewer` read-only, `operator`+ writes, `admin`+ suspend and unit status); UI actions (Add note Cmd+N, tag picker, edit form, ticket, stage picker with Lost dropdown); tests for audit rows, role gates, idempotent replay. Also: the Sprint 1 operator findings list, triaged and fixed where small.

## Day 7 — Zoho delta sync

`tools/zoho-sync`: Bulk Read per module on a `Modified_Time` cursor; `stage --append`; transforms in upsert mode (`{{MODE}}` reload | upsert, no truncates, `on conflict` on `zoho_id` and on `(tenant_id, source, source_ref)`); nightly id sweep → soft delete; cursors in `import.runs.summary`; hourly job in the API worker; Migration screen shows sync status. Fixture test: a second run with an edited row updates one row and duplicates nothing.

## Day 8 — Auth, roles, staff

Magic link + TOTP; server sessions; `tenant_memberships` → scope; development headers ignored outside development; staff management screen; audit viewer; POPIA subject-data export endpoint; login rate limits.

## Day 9 — Inbox (read-only), Legacy browser, reports, hosting

Conversations/messages API and read-only Inbox; Legacy (Zoho) tab on customer, site, unit and the Migration legacy browser; Reports churn/new and the daily digest job. Hosting: managed Postgres 16 + object storage (decision O10), deploy API and web, secrets, backups, observability, attachments re-host job; CoWork or an operator runs Contract A against staging.

## Day 10 — Parallel-run readiness

Performance on the full dataset (customer list, 360 with timeline, cockpit under 2 s); market-default review and reassign tool (audited); UAT checklist per screen by one FXSA and one FXNO operator; delta sync running hourly on staging for 48 hours; go/no-go note for M5 in `docs/sprints/day-10.md`.

---

## Carry-over and re-planning

After Day 5, re-read Sprint 2 with the day logs, the real-data reconciliation and the operator walk-through in hand. Day 6 absorbs the small findings; larger ones become their own items. Day 9 depends on the hosting decision (O10).
