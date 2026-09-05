# Phase 1 — A simple system on the Zoho data

**Goal.** FXSA and FXNO staff use the new operator console instead of Zoho for day-to-day lookups and CRM work, on a tenant-isolated database that holds every record from the Zoho backup, kept current by a delta sync until Zoho is switched off.

**Not the goal.** Billing, live channels, door control, AI. Each has a visible empty state in the console that names its phase (see `05-UX-PHASE-1.md`).

---

## 1. What ships

| # | Deliverable | Where |
|---|---|---|
| 1 | Full backup loaded: three tenants (fxsa, fxno, fxfi), `legacy.*` complete, `public.*` mapped | `tools/zoho-import`, `db/` |
| 2 | Reconciliation report signed off against the backup analysis numbers | `import.checks`, Migration screen |
| 3 | Zoho delta sync (hourly) into legacy and core | `tools/zoho-sync` (to build) |
| 4 | API: read endpoints for the nine Phase 1 screens + CRM writes + auth/roles/RLS | `apps/api` (to build) |
| 5 | Console: the prototype's screens on real data, tenant switcher, Migration screen, Legacy tabs | `apps/web` (from `ux/prototype`) |
| 6 | Parallel run, cutover, Zoho read-only, archive | runbook §6 |

---

## 2. Milestones

| Milestone | Definition of done |
|---|---|
| **M0 Load** | `zoho-import run --expect-full-backup` finishes with zero `error` checks on staging; the `fill` warnings are triaged (aliases added or accepted). |
| **M1 Reconcile** | Counts in §5 match; market distribution reviewed per table; the list of customers with `market_source='default'` is reviewed by an operator per tenant and reassigned where wrong. |
| **M2 Sync** | Delta sync runs hourly for 7 days with no divergence between Zoho and `legacy.*` for Contacts, Sales_Orders, Payments, Products, AppEvents (spot-checked by `Modified_Time` windows). |
| **M3 Read console** | Cockpit-lite, customers list + 360, facilities + units, subs & payments, arrears, leads, reports, devices inventory render for both tenants from the API; every list is tenant-scoped through RLS; Playwright smoke passes. |
| **M4 CRM writes** | Notes, tags, tickets, lead stage/loss reason, customer edits, unit maintenance flag, staff management — each writes `activity_log` + `audit_log`; write access follows roles. |
| **M5 Parallel run** | 3–4 weeks: operators use the console; discrepancies are logged as issues; documents (1.1 GB attachments) re-hosted to object storage with `documents.storage_key` set. |
| **M6 Cutover** | Zoho writes frozen; final delta; reconciliation re-run; Zoho set read-only; export archived; tenants' `settings.source_of_record = 'pms'`. |

---

## 3. Data flow

```
zoho backup (CSV)  ──stage──▶  zoho_raw.*  ──legacy──▶  legacy.*  ──core──▶  public.*  ──▶  API ──▶ console
                                                              ▲                    ▲
Zoho Bulk Read API (delta) ───────────────────────────────────┘────────────────────┘  (upsert on tenant_id + source + source_ref)
```

* **Initial load** is a full reload of the core tables the importer fills (`300_core_users.sql` truncates them in one statement). It is safe to re-run until cutover.
* **Delta sync** never truncates. It reads each Zoho module with `Modified_Time > cursor` via Bulk Read (200k records per job, CSV result), stages the result into `zoho_raw.<module>` with `--append`, then runs the same legacy transform in upsert mode and a core upsert keyed on `(tenant_id, source, source_ref)`. Deletions in Zoho are detected by a nightly id sweep (`Record Id` list per module) and applied as soft deletes.
* **Attachments** are indexed at load (`documents.local_path`) and copied to object storage during M5; the index is updated with `storage_key`.

Module → legacy → core mapping is specified in `03-ZOHO-IMPORT-SPEC.md`.

---

## 4. Screens on Phase 1 data

The prototype's screen is the contract; the third column says what feeds it in Phase 1. Full detail in `05-UX-PHASE-1.md`.

| Screen | Phase 1 state | Data |
|---|---|---|
| Ops cockpit | KPIs, site heat strip, today's schedule, live feed | `v_cockpit_kpis`, `v_site_occupancy`, `v_schedule`, `activity_log`; proposals and incidents panels show empty states |
| Inbox | Read-only history per customer | `conversations`, `messages` from imported emails/SMS/calls/chat transcripts |
| Customers | List + 360 (Overview, Subscriptions, Payments, Communications, Timeline, Notes, Documents, Legacy) | `customers`, `subscriptions`, `payments`, `messages`, `activity_log`, `notes`, `documents`, `legacy.contacts` |
| Corporate | Empty state (Phase 3) | — |
| Leads | Kanban with imported leads; stage changes and loss reasons editable | `leads`, `lead_campaigns`, `conversations` (chat transcripts) |
| AI activity | Empty state (Phase 5); capability table visible, all `off` | `agent_capabilities`, `agent_settings` |
| Devices | Sites grid → gateways → boards → locks, status from the last Zoho report; no actions | `devices` |
| Facilities | List, units table (Edit limited to notes/status), tech issues, landlord & contract (read) | `sites`, `units`, `unit_types`, `tech_tickets`, `landlords`, `site_agreements` |
| Subs & invoices | Subscriptions and Payments tabs; Invoices and Pricing tabs empty (Phase 2) | `subscriptions`, `payments`, `payment_instruments` |
| Arrears | Open arrears (derived), no dunning actions | `arrears_cases`, `v_arrears` |
| Reports | Occupancy per site (12 months from `unit.status_changed` history), MRR from active subscriptions, churn/new from `subscription.*` events | `activity_log`, `subscriptions`, `v_site_occupancy` |
| **Migration** (new) | Runs, checks, per-module counts, market distribution, source-of-record toggle | `import.*` |

---

## 5. Acceptance criteria

### 5.1 Reconciliation (from the backup analysis dated 2026-09-05)

`zoho-import validate --expect-full-backup` asserts these after M0:

| Legacy table | Expected rows |
|---|---|
| facilities | 55 |
| units | 7,071 |
| reservations | 27,214 |
| payment_details | 27,117 |
| payments | 187,664 (426 flagged `is_test`) |
| unit_status_history | 305,287 |
| reservation_status_history | 14,617 |
| gateways | 339 |
| communications | 79,175 |
| emails | 16,335 |
| smses | 28,554 |
| calls | 58,506 |
| notes | 14,287 |
| leads | 2,746 + 54 old contacts |
| property_prospects | 232 + 13 legacy properties |
| business_partners | 90 |
| offer_requests | 14,049 |
| app_events | 2,087,453 |
| app_event_gateways | 6,257 |
| attachments | 399 |
| zoho_users | 32 |

SA slice (market = SA): 11 facilities, 1,613 units, 4,464 reservations, 44,482 ZAR payments, 1,146 leads, 30 prospects, 14 partners.

FK resolution must match the analysis: reservations→units 100%, reservations→facilities 100%, payments→reservations 100%, units→facilities 100%, unit_status_history→units 100%; reservations→contacts by User ID ≥ 97.6% (the remainder are deleted app accounts, imported as orphan placeholder customers).

Core: `sites` = 55; `units` = 7,071; `customers` = every legacy contact that is not a SalesIQ stub, plus orphan placeholders; `subscriptions` = reservations with payment status not in {UNPAID, PENDING}; `reservations` = the rest (7,735 UNPAID + 8 PENDING); `payments` = 187,238; `activity_log` ≥ 2,087,453 + communications + status histories.

### 5.2 Isolation

* With `app.tenant_ids = fxno`, a query on any table or view returns no SA row (automated in `tests/test_e2e.py` on the fixture; repeated on the full load).
* A cross-tenant insert is rejected by a composite foreign key (`test_e2e.py`).

### 5.3 Console

* Every Phase 1 screen loads under 2 s on staging with the full dataset (the memo's target), measured for the customer list, customer 360 with timeline, and the cockpit.
* Every write appears in the target's Activity tab and in `audit_log` with the acting user.

### 5.4 Parallel run exit

* Two consecutive weeks with no P1 discrepancy between Zoho and the console for customers, units, subscriptions, payments.
* Operators from both tenants confirm the screens they use daily are covered.
* Delta sync backlog < 1 hour at all times during the last week.

---

## 6. Cutover runbook

1. Announce a write freeze on Zoho (staff) and confirm the Flexistore backend integration user is paused or redirected.
2. Run the delta sync to completion; run `zoho-import validate --expect-full-backup` against fresh Bulk Read counts; attach the report to the Migration screen.
3. Set Zoho profiles to read-only; keep the org for the retention period.
4. Flip `tenants.settings.source_of_record` to `pms` for fxsa and fxno; the Migration screen shows "Zoho read-only since <date>".
5. Export a final Zoho backup and store it with the reconciliation report.
6. Keep the delta sync job in place but disabled; re-enable only if a discrepancy requires it.

---

## 7. Team and effort

Three engineers (backend, frontend, data/ops) plus the product owner. Estimate **8–10 weeks** including the parallel run (**confidence: low**). The critical path is M2 (delta sync correctness) → M3 (screens) → M5 (parallel run); M0/M1 can complete in the first two weeks because the tool exists.

---

## 8. Risks specific to this phase

| Risk | Mitigation |
|---|---|
| Real CSV headers differ from the assumed labels | Preflight + `aliases.json`; first real run is expected to need aliases (see `tools/zoho-import/README.md`) |
| Zoho Bulk Read limits or throttling during delta sync | Hourly windows are small; the sync tolerates retries; full re-load remains possible until cutover |
| Market misassignment for contacts without a reservation, financial tool or country | Reviewed at M1; reassign action in the console; `market_source='default'` share reported per tenant |
| Operators keep using Zoho during the parallel run | The console must be faster and clearer for the top tasks: customer lookup, unit status, last payment; these are validated first at M3 |
