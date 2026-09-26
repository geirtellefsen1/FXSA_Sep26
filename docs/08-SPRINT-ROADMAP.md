# Sprint roadmap — Sprints 3 through 13

Sprints 1 and 2 (`docs/07-SPRINTS.md`) finish Phase 1. This document evaluates every sprint from Sprint 3 to Sprint 13, using the same method — outcome, day-by-day goal and deliverables, acceptance — plus two things Sprints 1–2 didn't need: an explicit **confidence rating** and a **blockers** line, because from here on several sprints depend on a decision, a credential, or a vendor document that does not exist yet in this repository.

**How to read the confidence rating.** *High* — the scope is fixed by the memo/master plan and nothing external is needed to start. *Moderate* — the shape is right but a detail (an adapter's exact behaviour, a vendor's rate limits) will only be known once it's touched. *Low* — genuinely blocked; the day breakdown is a best guess and **should be rewritten** once the blocker clears, the same way Sprint 2 was left lighter than Sprint 1 pending Day 2's real-data findings.

**Sprint ↔ Phase map** (from `docs/00-MASTER-PLAN.md` §4):

| Sprint | Phase | Outcome |
|---|---|---|
| 3 | 1, close | Zoho switched off |
| 4 | 2, Money part 1 | FXSA invoices from the platform |
| 5 | 2, Money part 2 | FXSA collects, reconciles, prices dynamically |
| 6 | 3, Channels | Unified inbox live |
| 7 | 3, Customers | Self-service customer portal |
| 8 | 4, Devices | Remote control of sites |
| 9 | 4, Facilities | Site setup tooling |
| 10 | 5, Intelligence part 1 | The AI proposal loop, inbox and pricing |
| 11 | 5, Intelligence part 2 | Abandoned-cart recovery, auctions |
| 12 | 6, Multi-operator part 1 | Landlord portal, payouts |
| 13 | 6, Multi-operator part 2 | Onboarding, isolation, billing |

**Open questions this roadmap depends on** (full detail in `docs/06-DECISIONS.md`): O1 (existing FXSA API reuse, Sprint 4), O2 (WhatsApp provider, Sprint 6), O3 (VAT on insurance/software/auction, Sprint 4–5), O4 (EFT suspension threshold, Sprint 4–5/8), O5 (Kerong/StorPro docs, Sprint 8), O6 (NO/FI billing adapters, Sprint 5b), O9 (cross-tenant customer identity, Sprint 13), O10 (object storage provider, already needed by Sprint 1 M5).

---

## Sprint 3 — Phase 1, close: Zoho switched off

**Outcome.** The parallel run finishes clean; Zoho is frozen, read-only, and archived; the PMS is the system of record for FXSA and FXNO.

**Depends on.** Sprint 2 Day 10's go/no-go being a "go".

**Confidence: high.** This sprint is mostly operational (watching, fixing discrepancies, one cutover runbook), not new construction. The runbook already exists (`docs/01-PHASE-1.md` §6).

| Day | Goal | Deliverables | Acceptance |
|---|---|---|---|
| 1 | Parallel-run kickoff | Delta sync confirmed running on staging; both FXSA and FXNO operators using the console daily; a shared discrepancy log (a table or a tracked list, not a new subsystem) | First day's discrepancy log has entries or is empty by end of day, not "we didn't check" |
| 2 | Discrepancy triage, round 1 | Fix whatever Day 1 found: a mapping bug, a missing endpoint, a confusing screen; each fix re-verified against both the fixture test suite and the live staging data | Every Day 1 discrepancy closed or explicitly deferred with a reason |
| 3 | Discrepancy triage, round 2 + performance check | Repeat; also confirm Sprint 2 Day 10's timing targets still hold under real daily use (not just synthetic load) | Customer list, 360, cockpit still under 2 s during business hours |
| 4 | Cutover rehearsal | Dry-run the six-step runbook (`docs/01-PHASE-1.md` §6) against a staging copy: freeze, final delta, validate, read-only, archive, flip `source_of_record` | Dry run completes with the same reconciliation numbers as the live parallel run |
| 5 | Cutover | Execute the runbook for real, on production: write freeze on Zoho, final delta sync, `zoho-import validate --expect-full-backup` zero errors, Zoho set read-only, export archived per O8 (12 months, org owner), `tenants.settings.source_of_record = 'pms'` for fxsa and fxno | Migration screen shows "Zoho read-only since \<date\>"; an operator confirms Zoho login still works (read-only) but no write succeeds |

**Prompt (Day 5 only, the others are operational and don't need a fresh Claude Code session).**

```
Continue Phase 1 on branch claude/flexistore-pms-multitenant-yfu2hj. Read docs/01-PHASE-1.md §6 (cutover runbook), docs/sprints/day-10.md (the go/no-go note) and the Sprint 3 discrepancy log.
Execute the cutover runbook against production exactly as written: freeze, final delta sync, zoho-import validate --expect-full-backup, set Zoho profiles read-only, export and store the final backup, flip tenants.settings.source_of_record to 'pms' for fxsa and fxno. Update the Migration screen's cutover checklist to reflect completion. Write docs/sprints/day-15.md (or the next sequential day file) recording the exact cutover time and the final reconciliation numbers.
```

---

## Sprint 4 — Phase 2, Money part 1: FXSA invoices

**Outcome.** FXSA generates real invoices from subscriptions and takes a Paystack card payment.

**Depends on.** Sprint 3 (FXSA is now the system of record); Paystack sandbox credentials; a decision on O1 (reuse vs rebuild).

**Confidence: moderate.** The invoice/billing-day/pro-rata rules are fully specified (`docs/00-MASTER-PLAN.md` Phase 2, master spec §4.3–4.5 referenced there). The unknown is O1: if a usable FXSA API already exists, this sprint is mostly porting; if not, it's building from scratch. The day plan below assumes building from scratch (the safer assumption) and should be cut roughly in half if O1 resolves to "reuse".

**Blockers to resolve before Day 1:** O1 (reuse decision), Paystack test API keys, O3 partially (at minimum confirm storage-rental VAT, which is uncontested at 15%; insurance/software-fee VAT can wait until those product lines are enabled).

| Day | Goal | Deliverables | Acceptance |
|---|---|---|---|
| 1 | Billing-day and pro-rata engine | `invoices`/`invoice_lines` write path; a pure function computing period/pro-rata/VAT per the master-spec rules (`docs/00-MASTER-PLAN.md` §4.3 rules already documented); unit tests covering the three scenarios in the spec table (sign-up mid-month, cancellation mid-month, 31st billing day in February) | Property-based or table-driven tests match the spec's worked examples exactly |
| 2 | Monthly billing run | `POST /api/billing-runs` (per tenant, per month) generating one invoice per active subscription due that day; idempotent (`Idempotency-Key`, and a natural `(subscription_id, period_start)` uniqueness guard) | Running the batch twice produces the same invoice, not two |
| 3 | Invoice PDF + `GET /api/invoices` | PDF rendering (a simple HTML→PDF path is enough for v1) stored via the Sprint 1/Day 9 object-storage adapter (O10); list/detail endpoints; web: Invoices tab goes from empty state to live | An invoice PDF opens and shows subtotal/VAT/total/customer/period correctly |
| 4 | Paystack adapter, part 1 | Card tokenisation (client-side, card data never touches the API); `POST /api/invoices/:id/pay` creates a Paystack transaction; webhook endpoint verifies signature and marks the payment settled | A sandbox card payment moves an invoice from pending to paid end-to-end |
| 5 | Manual EFT recording + reconciliation | `POST /api/invoices/:id/record-payment` for manual EFT; reference-matching against outstanding invoices; Payments tab shows both rails | An EFT payment recorded manually reconciles against the right invoice and updates `outstanding_minor` |

---

## Sprint 5 — Phase 2, Money part 2: collection, Xero, pricing

**Outcome.** FXSA's money side is complete: retries happen automatically, Xero has the ledger, prices move with occupancy, and campaigns discount correctly.

**Depends on.** Sprint 4.

**Confidence: moderate.** Retry cascade and dunning stages are specified (master spec §4.10, already summarised in `docs/00-MASTER-PLAN.md`). Xero's exact API idempotency behaviour and rate limits are the main unknown until it's actually called (O1 again — if the reused API already has a working Xero client, this is much faster).

| Day | Goal | Deliverables | Acceptance |
|---|---|---|---|
| 1 | Retry cascade + dunning stages | Scheduled job: Paystack retry on day 1/2/3, then overdue, then day 5/8/12/17/24 per the memo; `arrears_cases` populated automatically (already partially derived at import — this makes it live); daily reminder message stub (real channel arrives Sprint 6) | A failed test payment progresses through the stage sequence on the expected days in a time-accelerated test |
| 2 | Late fees + access-revocation hook | Late-fee invoice line after the grace period; a hook point that will call the Phase 4 overlock (`docs/00-MASTER-PLAN.md` Phase 4) but for now only flags `subscriptions.status = 'suspended'` | An overdue subscription past the grace period gets a late-fee line and flips to suspended |
| 3 | Xero adapter | OAuth2 connect flow, contact sync, invoice push (`ACCPAY`/`ACCREC` as appropriate), payment push, `xero_export_batches`-style idempotency (check before push, never duplicate) | Pushing the same invoice twice does not create a second Xero record |
| 4 | Three-price pricing engine | `pricing_rules` (occupancy bands per site×unit_type) made live: recalculation on subscription start/end/unit status change; `contracted_price_minor` immutability enforced at the application layer per the master spec's core invariant | An occupancy change recalculates `listed_price_minor` on the unit type but never touches an existing subscription's `price_minor` |
| 5 | Discount campaigns + money reports | Campaign CRUD, stacking rule (unit-level overrides site-level), auto-expiry; Reports: collected/outstanding/discount-cost-by-site sections go live | A discount attached at sign-up shows full rate + discount + net on the invoice, and expires automatically after N months with no operator action |

---

## Sprint 6 — Phase 3, Channels: the inbox goes live

**Outcome.** WhatsApp, email and SMS messages flow into the console in real time; corporate accounts exist.

**Depends on.** O2 (WhatsApp provider decision); Meta business verification (can take weeks — start this in parallel with Sprint 4/5, not at the start of Sprint 6).

**Confidence: low on WhatsApp, moderate on everything else.** Business verification timelines are outside this project's control. Email/SMS are conventional and can proceed regardless.

**Recommendation:** kick off the WhatsApp Business verification process (or BSP contract) at the *start* of Sprint 4, in parallel, so it isn't the long pole when Sprint 6 arrives.

| Day | Goal | Deliverables | Acceptance |
|---|---|---|---|
| 1 | Channel adapter skeleton | `POST /api/channel/send` (memo's cross-cutting contract), provider-agnostic; email via SES/Mailgun implemented first (no external approval needed) | A test email send/receive round-trips into a conversation |
| 2 | SMS + inbound webhooks | BulkSMS (already integrated for legacy import, so the provider relationship exists) send/receive; `POST /api/webhooks/email/inbound` threading via `In-Reply-To` | An inbound SMS reply appends to the right conversation, not a new one |
| 3 | WhatsApp, if verification landed; otherwise a stub | If ready: WhatsApp Business Cloud API send/receive, template messages outside the 24h window; if not ready: build the UI and data path against a manual "simulate inbound" test harness so Days 4–5 aren't blocked | A WhatsApp message (real or simulated) shows in the inbox with the right channel chip |
| 4 | Inbox screen goes live | Composer, needs-me/bot/all tabs (bot tab stays empty until Sprint 10), right rail recent activity live, escalation marker | An operator sends a reply from the console and the customer's channel receives it |
| 5 | Corporate accounts | `corporate_accounts`/`corporate_users`/`corporate_unit_users` write paths, invite flow (email + optionally WhatsApp), Corporate screen goes from empty state to live (units, users, consolidated invoice, reconciliation table) | Inviting a corporate user sends the invite and the accepted user sees their allocated units |

---

## Sprint 7 — Phase 3, Customers: self-service

**Outcome.** A prospect can sign up and pay without staff involvement; an existing customer manages their own account.

**Depends on.** Sprint 6 (channel adapter for confirmations); Sprint 4 (Paystack).

**Confidence: high.** This is a conventional web sign-up/portal build against contracts already fixed by the memo (§17) and the schema (`reservations`, `payment_instruments`).

| Day | Goal | Deliverables | Acceptance |
|---|---|---|---|
| 1 | Public browse + reserve | Unit availability by site/type (public, no auth), reserve flow creating a `reservations` row with a hold and a Paystack pre-auth link | A reservation expires and releases the unit if unpaid within the hold window |
| 2 | Sign-up + e-signature | Customer account creation, digital lease generation, e-signature capture (a mobile-friendly signature pad is enough for v1), documents storage | A completed sign-up produces a stored, signed lease document linked to the subscription |
| 3 | Customer portal shell | Separate auth surface (own JWT audience per the planning-reference architecture, `docs/05-UX-PHASE-1.md` note on portals), dashboard: subscriptions, next billing, outstanding balance banner | A customer cannot use their token against the operator console API and vice versa |
| 4 | Portal invoices + payments | Invoice history, pay-now (Paystack), card management (add/remove, never touching raw card data) | A customer pays an overdue invoice from the portal and the operator console reflects it within the same request cycle |
| 5 | POPIA self-service + leads-from-channels | `/api/me/data-export`, `/api/me/erasure-request`; website-form and WhatsApp-first-contact leads wired into `leads` with UTM/gclid capture | A data-export request returns a complete JSON of the customer's own records; an erasure request lands in a reviewable queue (full processing is Sprint 13) |

---

## Sprint 8 — Phase 4, Devices: remote control

**Outcome.** Staff can see live device status and safely act on it; overlock enforces arrears automatically.

**Depends on.** O5 (Kerong/StorPro documentation, Flexilock RPi protocol) — **this is the sprint most likely to slip**, per the master plan's own risk note.

**Confidence: low**, purely because of O5. The device *registry* (already populated at import) and the UI shell (already built read-only in Phase 1) are not blocked; only the live-control adapters are.

**Recommendation:** if O5 hasn't resolved by the time Sprint 6/7 finish, swap Sprint 8 and 9 with the master plan's stated fallback, or pull Sprint 10 (Intelligence, which doesn't need live devices) forward instead.

| Day | Goal | Deliverables | Acceptance |
|---|---|---|---|
| 1 | Heartbeat watcher | Poll or webhook-based heartbeat per gateway (protocol depends on O5); `device.status_changed` events; anomaly rule (2 missed pings → bad, sustained >100ms → watch) | A simulated gateway outage flips status within the poll interval and raises an incident |
| 2 | UDM/Kerong adapters | UniFi controller API (stats, PoE toggle) and Kerong gateway HTTP API (unlock/cycle/reboot) — exact calls depend on O5's documentation | A test unlock command round-trips against real or vendor-sandbox hardware |
| 3 | Power actions with confirmation | Blast-radius banner (affected customers/units), AI pre-flight is rule-based for now (schedule check only, no LLM), "log this action" checkbox | A power-cycle action lists the correct affected customer set before confirming |
| 4 | Remote unlock + key sharing | `POST /api/access/units/:id/unlock`, expiring shared digital keys, staff-vs-customer access logs kept separate | A shared key expires and access is denied after its window, logged as denied not silently |
| 5 | Overlock on arrears | The Sprint 5 Day 2 hook becomes real: an overdue subscription fires an active lock command, not passive denial; removed within seconds of payment | A test payment on a suspended subscription restores access within the same request cycle that settles the payment |

---

## Sprint 9 — Phase 4, Facilities: site setup tooling

**Outcome.** Staff can lay out a floor plan, wire a unit's hardware, and launch a new facility end to end.

**Depends on.** Sprint 8 (device topology is real, not just imported).

**Confidence: moderate.** The wizard's five steps are fully specified in the memo (§8); the floor-plan editor's interaction design is the main open design work (not a blocker, just genuinely new UI).

| Day | Goal | Deliverables | Acceptance |
|---|---|---|---|
| 1 | Floor-plan data model + renderer | Real zone/unit geometry (beyond Phase 1's single default zone), an SVG or canvas renderer reading `zones.layout` | An operator can view a facility with more than one zone laid out correctly |
| 2 | Floor-plan editor | Drag-to-place units, zone editing, VIP/issue markers | A newly placed unit persists its position and appears correctly on reload |
| 3 | Unit modal + edit-facility modal | Full identity/tier/pricing/hardware/wiring/distance fields editable; edit-facility tabs (Basics/Lease/Pricing/Security/Network/Danger zone) with Adam's-sign-off gate on Danger zone actions | Editing a unit's wiring updates the device tree link, not just a text field |
| 4 | New-facility wizard, steps 1–3 | Basics, unit catalog & pricing (free-form types + per-unit configurator), doors/coding | A wizard run produces a real `sites` row with correctly wired units, not a placeholder |
| 5 | New-facility wizard, steps 4–5 | Infrastructure (network/power/CCTV), launch checklist with the six categories and financial summary, AI pre-create offer stubs (UniFi site, Xero contact, etc. — real integration where the adapter already exists from earlier sprints, stubbed otherwise) | A completed wizard run leaves the facility in `status = 'soft-launch'` with every checklist item either done or explicitly deferred |

---

## Sprint 10 — Phase 5, Intelligence part 1: proposals, drafts, pricing

**Outcome.** The AI proposal loop from the prototype is real for its first three capabilities.

**Depends on.** Sprints 4–9 (there is nothing to propose without money, channels, and devices to act on). Three months of platform-native data is the master plan's stated ideal for calibrating thresholds — this sprint should ship with autonomy defaulted to `approve` (never `autonomous`) until that data exists.

**Confidence: moderate.** The schema (`agent_capabilities`, `agent_proposals`) and UI (AI activity screen) already exist from Phase 1. The genuinely new work is the classifiers/heuristics behind each capability, which is real engineering, not integration.

| Day | Goal | Deliverables | Acceptance |
|---|---|---|---|
| 1 | Proposal engine core | `POST /api/agent/proposals` internal creation path, approve/reject/adjust endpoints firing the named side-effect, `agent_activity` feed | Approving a proposal calls its side-effect endpoint exactly once (idempotency test) |
| 2 | `send_payment_reminder_gentle`/`firm` | Rule-based (not ML) trigger: N days overdue → propose a reminder with the customer's payment history as rationale text | A test arrears case at day 7 produces exactly one gentle-reminder proposal |
| 3 | `reply_routine_chat` (inbox drafts) | Intent matching against a small curated pattern set (not a full LLM integration unless the team decides otherwise — flag this as an explicit build-vs-integrate decision at sprint start), confidence score, draft attached to conversation | A routine "what are your hours" message produces a correct draft with a stated confidence |
| 4 | `adjust_listed_price_pct_10` | Reads `pricing_rules`/occupancy bands (Sprint 5), proposes a bounded adjustment with expected-impact text | A sustained low-occupancy site produces a price-drop proposal within the ±10% bound, never outside it |
| 5 | Autonomy table + activity feed live | `agent_settings` editable per tenant (mode/threshold), 7-day outcome counts, full activity feed replacing Phase 1's empty state | Flipping a capability to `autonomous` with a low threshold causes the next matching event to auto-execute and log as agent-actioned, not operator-actioned |

---

## Sprint 11 — Phase 5, Intelligence part 2: recovery and auctions

**Outcome.** Abandoned checkouts get chased automatically; the arrears-to-auction pipeline is real.

**Depends on.** Sprint 10 (the proposal engine); an iBidOnStorage seller account and API key (not yet listed as an open question — add it as O11 if not already arranged).

**Confidence: moderate.** The auction lifecycle is fully specified (memo §10, master spec §4.11); the unknown is purely the iBid integration's real API shape, which can only be confirmed once credentials exist.

| Day | Goal | Deliverables | Acceptance |
|---|---|---|---|
| 1 | Abandoned-checkout recovery | Reads `reservations.status = 'abandoned'`; WhatsApp/email follow-up at 24h and 72h per the memo | An abandoned reservation from Sprint 7 gets exactly two follow-up touches on schedule |
| 2 | Auction pipeline, stages | `auctions`/`auction_bids` write paths for at-risk → notice → inventory → listed; legal-notice document generation and trail | A case crossing the day-60 threshold auto-creates an `auctions` row in `at-risk` |
| 3 | iBid integration | `POST /api/auctions` push, webhook for bids/sold/payment-confirmed, photo upload (phone QR / drag-drop / CCTV snapshot pull) | A test listing appears correctly on iBidOnStorage's side (or its sandbox) |
| 4 | Key handover + legal trail | Winner contact, escrow status, single-use 7-day digital key issuance on payment confirmation, cleaning-deposit tracking | A confirmed sale auto-issues a working single-use key to the winner's phone |
| 5 | Lead qualification + stuck-lead detection | Scoring on inventory match + intent, auto `new → contacted`, stuck flag after 4 days surfaced on the cockpit | A lead with no reply after 4 days shows the stuck dot on the kanban and in the cockpit feed |

---

## Sprint 12 — Phase 6, Multi-operator part 1: landlord portal, payouts

**Outcome.** Property owners see their own numbers; FXSA runs a real monthly payout.

**Depends on.** Sprint 5 (revenue-share economics already modelled in `site_agreements`); Sprint 4 (settled-payment cash basis).

**Confidence: high.** The payout process is fully specified (master spec §4.15, already in the master plan) and is mostly a reporting/workflow build over data that already exists from Sprint 4–5.

| Day | Goal | Deliverables | Acceptance |
|---|---|---|---|
| 1 | Payout run engine | `payout_runs`/`payout_run_owners`/`payout_run_sites`/`payout_run_payment_lines` write path on settled-payment cash basis (never invoiced); one run per month enforced | Two runs for the same month are rejected, not silently duplicated |
| 2 | Payout preview + manual adjustments | Per-owner, per-site expandable preview; manual credit/debit lines with a written reason; reconciliation check (sum of payment lines = total cash received) blocking approval on mismatch | A deliberately mismatched test run is blocked from approval with a clear error |
| 3 | Approval + statement PDF | Named-operator approval (logged), PDF generation, email to accounts contact | An approved run's PDF matches the preview numbers exactly |
| 4 | Landlord portal, read-only surfaces | Separate JWT audience; KPI tiles with prior-month comparison, net-rental/move-in/move-out charts, monthly history table | A landlord cannot see any customer name, individual invoice, or pricing detail — a specific negative test per the memo's "strictly read-only" rule |
| 5 | Payout tab + owner activation | Owner-portal login provisioning (email/password, admin-managed), payout statements list with payment dates/references | A newly activated owner logs in and sees only their own sites' data |

---

## Sprint 13 — Phase 6, Multi-operator part 2: onboarding, isolation, billing

**Outcome.** A new self-storage operator — not Flexistore — can be onboarded as a tenant without a code change.

**Depends on.** Everything before it being stable for the two Flexistore tenants; O9 (cross-tenant identity) resolved in practice, not just recommended.

**Confidence: low**, honestly — this is the sprint furthest from anything concretely specified today. The schema already supports it (every table is tenant-scoped from Phase 1), but the *product* of "onboard a stranger's data" has no real-world test case yet. Treat the day breakdown below as a hypothesis, not a commitment, and re-derive it once a second real operator is actually in scope.

| Day | Goal | Deliverables | Acceptance |
|---|---|---|---|
| 1 | Tenant onboarding flow | Legal entity, currency/VAT/timezone, integrations, branding — a guided setup UI over the existing `tenants`/`tenant_memberships` schema | A new tenant can be created end-to-end without a psql session |
| 2 | Canonical CSV onboarding (Contract B) | The `zoho-import canonical --dir` loader promised in `docs/04-COWORK-EXPORT-RUNBOOK.md` §3, built for real | A Contract B file set for a small synthetic non-Zoho operator loads correctly, foreign keys resolved by natural key |
| 3 | Per-tenant encryption keys + data lifecycle | Application-layer per-tenant data key for secrets/banking details; export job; erasure queue with the SARS-retention guard (settled-payment customers flagged, not auto-purged) | A tenant's export dumps only that tenant's data; an erasure request against a customer with settled payments is blocked with the correct reason, not silently processed |
| 4 | Usage metering | Per-tenant counts (customers, sites, messages sent, API calls) feeding a billing-relevant table; no invoicing UI yet, just accurate metering | Metering counts for a synthetic tenant match a manual count exactly |
| 5 | Monitoring + SLA groundwork | Per-tenant dashboards/alerts, a status page, the isolation option (moving one tenant to its own database) documented as a runbook, not necessarily executed | The runbook for splitting a tenant to its own database is written and at least dry-run-checked against the fixture (export one tenant's rows, load into a fresh database, verify row counts match) |

---

## What to do with this document

- Treat Sprints 3 and 4 as trustworthy enough to hand to a Claude Code session close to verbatim, the way Sprint 1's days were.
- Treat Sprints 5–9 as a good starting point that will tighten once the sprint immediately before it lands (exactly the pattern already used between Sprint 1 and Sprint 2).
- Treat Sprints 10–13 as a hypothesis. Their value here is sequencing and dependency-mapping, not day-level executability — do not paste their day prompts into a fresh session without a re-read against whatever actually shipped in Sprints 4–9.
- Before starting Sprint 6, resolve O2 in parallel with Sprint 4/5 — it is the single longest lead time in the whole roadmap and the only one worth starting early on its own.
