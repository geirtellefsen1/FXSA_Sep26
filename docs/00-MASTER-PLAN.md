# Flexistore PMS — Master Plan

**Scope.** A multi-tenant property management system (PMS) for self-storage operators, built first for Flexistore South Africa (FXSA) and Flexistore Norway (FXNO), designed from day one so a third operator is a configuration row, not a fork.

**Master for the product.** The operator-console UX in `ux/prototype/` (screens + `MEMO.md`) defines what the system does. Everything in this plan derives from it.

**Master for the existing data.** The Zoho CRM backup analysed in `docs/source/ZOHO_BACKUP_CRM_IMPORT_SPEC_2.md`. It is the input to Phase 1, not a design input: it lands in a `legacy` schema untouched, and only what the future model has a place for is mapped across.

Confidence levels are stated where a claim is not verifiable from the source material. Everything else in this document is either derived from the memo, the backup analysis, or the code in this repository.

---

## 1. Where things actually stand

Facts, not aspirations:

1. **Zoho is a mirror, not a system of record.** Almost every operational record in the backup is owned by `integration@flexistore.no` or `johanv@flexistore.no`; the canonical keys are backend UUIDs from the Flexistore app backend built for Norway. Zoho holds a copy plus the CRM add-ons Zoho itself generated (SalesIQ visitors, calls, notes, emails, SMS log, leads, property pipeline).
2. **One Zoho org serves three markets.** Norway (42 facilities), South Africa (11), Finland (2) share the same tables. The `Organisation` field is untagged (`Flexistore`) on 47% of reservations and 40% of payments before 2025. Market has to be derived from facility country, currency, or the accounting tool (Xero = SA, PowerOffice = NO).
3. **The UX prototype is ahead of the backend.** The memo specifies inbox, AI proposals, device topology, auctions and corporate accounts that no current system provides. The planning reference bundled with the prototype describes a partially built FXSA API (customers, subscriptions, invoices, Paystack, payouts, POPIA) with milestones up to "M21c". That codebase is not in this repository and was not verified; this plan does not depend on it, but Phase 2 should evaluate reusing it before rebuilding (confidence that it exists in a usable state: **unknown**).
4. **FXSA's operational data is thinner than it looks.** Of 27,214 Zoho reservations, 7,735 are abandoned checkouts. Zoho has no invoices at all: money exists only as payment attempts (187,664 rows, 426 test). Occupancy counters on facilities stopped updating on 2025-12-10; unit status is the only live occupancy signal.
5. **The event log is the biggest asset and the biggest volume.** 2.09M app events (unlocks, payment attempts, tenancy changes, pricing-engine notices) are the only history of what actually happened to each customer, unit and door. They are worth keeping in full and are cheap to keep in Postgres.

Consequence: the first phase must be a **simple, read-mostly system on the existing data** that operators actually open instead of Zoho, with writes limited to CRM work (notes, tags, tickets, lead stage, customer edits). Billing, access and AI come after, in the order the memo's screens need them.

---

## 2. Product definition

One platform, four surfaces, N tenants.

| Surface | Users | Phase |
|---|---|---|
| **Operator console** (the prototype) | Staff of one or more tenants | 1 → 5 |
| **Customer portal / WhatsApp** | Renters | 3 |
| **Landlord portal** | Property owners | 6 |
| **Tenant admin** | Operator's own admins (config, staff, integrations, branding) | 6 (minimal version in 1) |

Modules, in the order the prototype's sidebar lists them, with the phase that makes each one real:

| Sidebar item | What it needs to work | Phase |
|---|---|---|
| Ops cockpit | KPIs from subscriptions/payments, site occupancy, schedule, live feed from `activity_log` | 1 (KPIs, occupancy, schedule, feed) · 4 (devices) · 5 (proposals) |
| Inbox | Conversations + messages + channel adapters + AI drafts | 1 (imported history, read-only) · 3 (live channels) · 5 (drafts) |
| Customers | Customer 360: subscriptions, payments, comms, timeline, notes, tags, documents | 1 |
| Corporate | Corporate accounts, users, unit allocation, consolidated invoices | 3 |
| Leads | Kanban, stage changes, loss reasons, reservation link | 1 (imported, manual stages) · 3 (channels) · 5 (AI qualification) |
| AI activity | Capabilities, autonomy thresholds, proposals, approve/adjust/reject | 5 |
| Devices | UDM → gateway → hub → lock topology, live status, power actions | 1 (inventory from Zoho gateways + unit wiring) · 4 (live control) |
| Facilities | Site list, floor plan, units table, tech issues, landlord & contract, new-facility wizard | 1 (list, units, tickets) · 4 (floor plan editor, wizard) |
| Subs & invoices | Invoices, subscriptions, payments, pricing rules | 1 (subscriptions + payments; invoices empty) · 2 (invoices, pricing) |
| Arrears | Cases, dunning stages, auction pipeline | 1 (cases derived from legacy status) · 2 (dunning) · 5 (auctions) |
| Reports | MRR, churn, occupancy, CS, anomalies, saved digests | 1 (occupancy, MRR, churn from history) · 2 (money) · 5 (CS/anomalies) |

---

## 3. Architecture

### 3.1 Tenancy model

```
org  (Flexistore International)            ← cross-tenant staff, group reporting
 └─ tenant  fxsa / fxno / fxfi / <operator> ← country, currency, VAT, timezone, locale, integrations, brand
     └─ site → zone → unit → lock
     └─ customer → subscription → payment
```

* **Single Postgres, single schema, `tenant_id` on every row, row-level security.** The app sets `app.tenant_ids` per request; org admins get every tenant of their org. Views are `security_invoker` so RLS applies through them. The importer runs as a `BYPASSRLS` role.
* **Tenant-scoped foreign keys.** Every child→parent reference is `(tenant_id, id) → (tenant_id, id)` (60 composite constraints in `db/migrations/0002_core.sql`). A row cannot reference another tenant's parent whatever the application does. Partitioned tables enforce the same with a trigger.
* **Per-tenant counters** (`next_number(tenant, key)`) for account, invoice, lead and ticket numbers; gap-free under concurrency.
* **Partitioning by month** for the two unbounded tables (`activity_log`, `messages`) and for `legacy.app_events`.
* **Why shared-schema and not database-per-tenant:** the Flexistore group needs cross-tenant reporting and shared staff today; a third-party operator gets hard isolation from RLS + composite keys; and because every row is tenant-keyed, a large tenant can be moved to its own database later with `pg_dump --where` without a schema change. Database-per-tenant from the start would cost operational overhead now for isolation the design already provides.
* **Per-tenant secrets and keys** (payment provider tokens, WhatsApp tokens, landlord banking) are encrypted at the application layer with a tenant-specific data key; the database never holds plaintext.

### 3.2 Schemas

| Schema | Purpose | Written by |
|---|---|---|
| `public` | The core model (45 tables + 4 views), derived from the UX memo. See `docs/02-DATA-MODEL.md`. | The application; the importer's core stage |
| `legacy` | The Zoho backup, typed and cleaned (30 tables). The existing data, unchanged in meaning. | The importer only |
| `zoho_raw` | Verbatim CSV staging, text columns, one table per module. | The importer only |
| `import` | Run bookkeeping, reconciliation checks, helper functions. | The importer; read by the Migration screen |

### 3.3 Integration adapters

Every external dependency sits behind an interface chosen per tenant in `tenants.integrations`:

| Adapter | FXSA | FXNO | FXFI | Phase |
|---|---|---|---|---|
| Payments | Paystack (cards, EFT); Stripe legacy | Stripe, Vipps | Stripe | 2 |
| Accounting | Xero | PowerOffice Go | none | 2 |
| KYC | SumSub, VerifyID | Vipps, BankID | none | 3 |
| Channels | WhatsApp Business, email, BulkSMS | email, BulkSMS | email | 3 |
| Access hardware | Flexilock RPi gateways (today) → Kerong KR-A165/CU16 + UDM (memo) | Flexilock RPi | Flexilock RPi | 4 |
| Auctions | iBidOnStorage | none | none | 5 |

The core model never contains provider-specific columns; provider references live in `provider`/`provider_ref` pairs and `raw` jsonb.

### 3.4 Application

* **API**: one service, REST as specified endpoint-by-endpoint in the memo, JSON, `Idempotency-Key` on every write, every state change appended to `activity_log` and `audit_log`. TypeScript/Node (NestJS or Fastify) or Python (FastAPI) — both fine; the choice should follow whichever the existing FXSA API uses if it is reused (see §1.3). **Recommendation: TypeScript**, because the prototype is React and one language across the stack lowers the cost of a small team (confidence: moderate).
* **Web**: the prototype's React screens, moved from Babel-standalone to Vite + TypeScript, data via TanStack Query against the API. Design tokens stay the prototype's (`tokens.css`).
* **Workers**: scheduled jobs (billing runs, dunning, digests, delta sync) and webhook consumers, same codebase, separate process.
* **Hosting**: managed Postgres 16 (RLS, partitioning, `pgcrypto`), object storage for documents (DigitalOcean Spaces per the memo), one region close to the majority of operators' staff. FXSA and FXNO share one deployment; latency to Norway from Johannesburg is acceptable for a back-office console (confidence: moderate; measure in Phase 1).
* **Observability**: request ids in every log line and error response, structured logs, per-tenant metrics (requests, errors, job durations), alerting on failed jobs and webhook backlogs.

### 3.5 Security and compliance baseline

* Staff auth: email + password + TOTP (the planning reference's existing flow) or magic link + TOTP (memo). Role gates `super_admin / admin / manager / operator / viewer` enforced in the API, not only the UI.
* POPIA/GDPR: subject-access export and erasure request flows are core features (Phase 1 for export, Phase 6 for the full erasure queue); DOB is not imported unless explicitly enabled; the shared guest WiFi password in the Zoho export is dropped at import.
* Soft delete everywhere the memo says so; hard delete only via an admin job that is itself audited.

---

## 4. Phases

Each phase ends with something operators use. Dependencies are listed so the order can be defended.

### Phase 0 — Foundation (this repository, done)

* Tenancy + core + legacy schemas with RLS and tenant-scoped keys (`db/`).
* `zoho-import` tool: stage → legacy → core → validate, with a header-contract preflight and an alias escape hatch; tested end-to-end on a synthetic fixture (`tools/zoho-import/`).
* The prototype under version control with the Phase 1 shell changes (`ux/prototype/`).
* This plan, the Phase 1 plan, data model, import spec, CoWork runbook, UX spec, decision log (`docs/`).

### Phase 1 — A simple system on the Zoho data

**Outcome:** FXSA and FXNO staff open the new console, not Zoho, for customer, unit, payment and lead lookups; the group's data is in one tenant-isolated database; Zoho is sunset after a parallel run.

**Scope**

1. Load the full backup (SA, NO and FI as three tenants) with `zoho-import`; reconcile against the backup analysis numbers.
2. **Zoho delta sync**: a scheduled job that uses the Zoho Bulk Read API per module with a `Modified_Time` cursor and upserts into `legacy.*` then `public.*` on `(tenant_id, source, source_ref)`. Runs hourly during the parallel period. The Zoho module API names are confirmed (`Price_Books`, `Products`, `Sales_Orders`, `Contacts`, `Payments`, `Payment_Details`, `AppEvents`, `Communications`, `Gateways`, `Property_Agreements`, `Business_Partners`, `bulksmscom__SMSes`, `OfferRequests`, `Leads`, `Calls`, `Tasks`, `Notes`, `Campaigns`).
3. API + web for the screens that work on this data (detail in `docs/05-UX-PHASE-1.md`): cockpit-lite, customers list + 360, facilities + units, subs & payments, arrears (derived), leads, reports (occupancy, MRR, churn), devices inventory, inbox and AI as read-only/empty states, a **Migration** screen (runs, checks, counts, source-of-record status), a **Legacy (Zoho)** tab on customer, site and unit for everything that stayed legacy-only.
4. Writes: notes, tags, tech tickets, lead stage + loss reason, customer contact edits, unit notes/status (maintenance flag), staff management. Each write goes to `activity_log` + `audit_log`.
5. Auth, roles, tenant switcher for org staff, per-tenant currency/locale rendering.
6. Cutover: freeze Zoho writes, final delta, reconciliation report, Zoho read-only, then export archive.

**Not in Phase 1:** invoices, billing runs, dunning messages, live channels, remote unlock, AI proposals, corporate accounts, customer or landlord portals. Each has an explicit empty state in the UI that names its phase.

**Dependencies:** Phase 0; Zoho API access (already used by the connector in this session); a hosted Postgres.

**Acceptance criteria** are in `docs/01-PHASE-1.md` §5 (reconciliation numbers, RLS proof, screen checklist, parallel-run exit criteria).

### Phase 2 — Money (FXSA first)

**Outcome:** FXSA invoices, collects and reconciles from the platform; Xero receives what it needs; operators work arrears from the console.

* Invoices + lines, monthly billing runs with the billing-day rule, pro-rata, VAT per line, PDF rendering.
* Paystack adapter: card tokenisation, recurring charge, retry cascade, EFT reference matching, webhooks.
* Xero adapter: contacts, invoices, payments, idempotent exports, error queue.
* Arrears: dunning stages (gentle → firm → arranged → pre-auction), access-revocation hook (used by Phase 4), reminders through whatever channel exists (email/SMS now, WhatsApp in Phase 3).
* Pricing: three-price model (base, listed, contracted), occupancy bands per site × unit type, scheduled increases with notice, discount campaigns. `price_history` already carries the Norwegian engine's history for calibration.
* Reports: money sections (collected, outstanding, discount cost, revenue by product).
* FXNO: read-only on this module until the Stripe/Vipps and PowerOffice adapters are built (Phase 2b, same interfaces).

**Dependencies:** Phase 1 live for FXSA; Paystack and Xero credentials; accountant sign-off on VAT treatment of insurance, software fee and auction income (open in the decision log).

### Phase 3 — Channels and customers

**Outcome:** the unified inbox is live; customers self-serve; corporate accounts exist.

* Channel adapter (memo "Channel Adapter"): WhatsApp Business Cloud API, email (SES/Mailgun) with conversation threading headers, SMS, website chat. Inbound webhooks create/append conversations; outbound goes through one `POST /api/channel/send`.
* Inbox screen fully live: needs-me / bot / all, composer, right rail with customer card and recent activity.
* Corporate accounts: units with labels and cost codes, users with unit scope, invitations, consolidated invoice, reconciliation table.
* Customer portal: sign-up → reserve → pay (Paystack) → e-signature → confirmation; subscriptions, invoices, pay now, card management, POPIA self-service.
* Leads from channels: website forms, WhatsApp first contact, Google Ads gclid.

**Dependencies:** Phase 2 (payments for the sign-up flow); Meta business verification for WhatsApp; a decision on the WhatsApp provider (open).

### Phase 4 — Devices and access

**Outcome:** doors, gateways and power are visible and controllable from the console; access events flow into the activity log live.

* Device registry from Phase 1 (gateway → board → lock from Zoho wiring) extended to the memo's target stack: UDM (PoE ports) → Kerong KR-A165 gateway → KR-CU16 hubs (RS-485) → locks/sensors/lights.
* Adapters: UniFi controller API (UDM stats, PoE toggle), Kerong gateway HTTP API (unlock, cycle, reboot), Flexilock RPi for existing sites.
* Heartbeat watcher → `device.status_changed`; anomaly rules (missed pings, latency); incidents on the cockpit banner.
* Power actions with blast-radius confirmation and AI pre-flight of the next 10 minutes of schedule (the pre-flight text is rule-based here; the AI wording arrives in Phase 5).
* Remote unlock, key sharing with expiry, overlock on arrears (hook from Phase 2), staff QR access.
* Facilities: floor-plan editor (zones, unit geometry), unit modal with hardware/wiring, new-facility wizard including infrastructure and launch checklist.

**Dependencies:** Phase 1; hardware and API documentation (the master spec records the Kerong/StorPro documentation as a blocker; the Flexilock RPi protocol is known to the Norwegian backend team, confidence that it is documented: **low**).

### Phase 5 — Intelligence

**Outcome:** the AI proposals loop from the prototype: the agent proposes, operators approve/adjust/reject, thresholds move autonomy per capability.

* `agent_capabilities` / `agent_settings` / `agent_proposals` (already in the schema) wired to side-effect endpoints listed in the memo.
* Inbox drafts with confidence and matched cases; auto-reply above threshold for `reply_routine_chat`.
* Lead qualification and stuck-lead detection; abandoned-checkout recovery reads `reservations.status = 'abandoned'`.
* Pricing recommendations from occupancy bands + `price_history`; arrears reminders as proposals; device actions as proposals during incidents.
* Auction pipeline: at-risk → notice → inventory (photos, AI description) → iBid listing → bids → key handover → legal trail.
* Reports: CS metrics, anomalies, saved digests on the memo's schedule.

**Dependencies:** Phases 2–4 (there is nothing to propose without money, channels and devices); three months of platform-native data for thresholds.

### Phase 6 — Multi-operator product

**Outcome:** a new operator is onboarded by configuration; landlords have a portal; the platform is billable.

* Tenant onboarding flow: legal entity, currency/VAT/timezone, integrations, branding, staff invites, site import (canonical CSV contract B from the CoWork runbook).
* Landlord portal: read-only KPIs, payouts, statements per site; payout runs (cash basis) with approval and audit lines.
* Tenant-level data lifecycle: export, erasure queue with retention guards, per-tenant encryption keys, optional dedicated database.
* Usage metering and billing of tenants; SLAs, status page, per-tenant monitoring.

**Dependencies:** everything above being stable for the Flexistore tenants.

---

## 5. Workstreams and sequencing

| Workstream | Phase 1 | Phase 2 | Phase 3 | Phase 4 | Phase 5 | Phase 6 |
|---|---|---|---|---|---|---|
| Data & migration | full load, delta sync, cutover | invoices backfill from payments (SA) | — | device registry migration | — | canonical CSV onboarding |
| API | read models, CRM writes, auth, RLS | billing, pricing, Paystack, Xero | channels, portal, corporate | device adapters, access | agent, auctions | onboarding, payouts, metering |
| Web (console) | 9 screens on real data + Migration | invoices, pricing, arrears live | inbox live, corporate | devices live, floor plan, wizard | AI screens | tenant admin |
| Portals | — | — | customer portal | — | — | landlord portal |
| Platform | hosting, CI, backups, observability | webhooks, job runner | channel webhooks | heartbeat watcher | model serving | per-tenant isolation options |

Rough effort, for a team of one backend, one frontend, one data/ops engineer, with the author as product owner. These are estimates from the scope above, not measured velocity (**confidence: low; ±50%**):

| Phase | Calendar |
|---|---|
| 1 | 8–10 weeks including a 3–4 week parallel run |
| 2 | 8–10 weeks (SA) + 4 weeks (NO adapters) |
| 3 | 8–12 weeks (WhatsApp verification is the long pole) |
| 4 | 6–10 weeks, hardware-dependent |
| 5 | 8–12 weeks |
| 6 | 8 weeks |

---

## 6. Delivery approach

* **Environments:** local (Docker Postgres + the app), staging (full backup loaded, anonymised emails/phones for non-staff testers), production. Migrations are plain SQL applied in order (`db/apply.sh`); no ORM-generated schema.
* **CI:** migrations applied from scratch + seed; `tools/zoho-import/tests/test_e2e.py`; API contract tests per endpoint in the memo; a Playwright smoke run of every console screen against staging data.
* **Data safety:** nightly base backups + WAL; the `legacy` schema is never modified after cutover except by delta sync; every importer run is recorded in `import.runs` with its checks.
* **Rollout per tenant:** Phase features are enabled per tenant with feature flags in `tenants.settings`, so FXSA can run Phase 2 while FXNO is still on Phase 1.

---

## 7. Risks

| Risk | Effect | Mitigation |
|---|---|---|
| Zoho CSV labels differ from the ones the transforms assume (the real headers were not available in this environment) | First real run stalls or leaves columns empty | Preflight reports missing required columns; optional ones become empty columns with fill-rate warnings; `aliases.json` fixes without code changes; `extra` jsonb keeps every source column |
| Market derivation puts some contacts in the wrong tenant | Wrong staff see a customer | `market_source` on every legacy row; the Migration screen shows the distribution; a reassign action moves a customer and dependants between tenants with an audit entry |
| The Flexistore app backend keeps writing to Zoho after cutover | Divergence | Delta sync keeps running until the backend is pointed at the new API (Phase 2/4); the sync is idempotent |
| The existing FXSA API (planning reference) is reused and its model diverges from this one | Two truths | Decide in Phase 2 planning: adopt this schema and port endpoints, or map; do not run both |
| Hardware API documentation (Kerong/StorPro, Flexilock) unavailable | Phase 4 slips | Phase 4 is decoupled from 2, 3 and 5; the device registry is useful without control |
| WhatsApp provider/verification delays | Phase 3 slips | Email + SMS channels first; WhatsApp added to the same adapter |
| Scope creep from the prototype (it shows Phase 5 everywhere) | Phase 1 never ships | Every non-Phase-1 element has an explicit empty state naming its phase; the plan's screen table is the contract |

---

## 8. Decisions taken in this plan

Full log with alternatives in `docs/06-DECISIONS.md`. The ones that shape everything:

1. The UX memo is the data model's source; Zoho is loaded as legacy data.
2. Shared schema + RLS + tenant-scoped composite keys; database-per-tenant is an option, not the default.
3. Money as integer minor units + currency per row.
4. Zoho SalesOrders split by payment status: paid/active/ended/blocked → `subscriptions`; unpaid/pending → `reservations`.
5. The event firehose goes into `activity_log` (partitioned), mapped to the memo's action vocabulary; the raw Zoho event type is kept.
6. Finland is imported as a third tenant because it is in the same backup; UX validation targets SA and NO.
7. Phase 1 replaces Zoho as the CRM; the Flexistore app backend remains the operational system until Phases 2–4.
