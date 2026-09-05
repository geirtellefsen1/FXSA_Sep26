# UX — Phase 1 on the operator-console prototype

The prototype in `ux/prototype/` is the master for the product. This document says what each of its screens does in Phase 1 (the simple system on the Zoho data), what changed in the shell to make it multi-tenant, and what waits for a later phase. `MEMO.md` in the prototype folder remains the page-by-page product spec; nothing here overrides it.

---

## 1. Shell changes made in this repository

| Change | Where | Why |
|---|---|---|
| **Tenant context** — `window.FXTENANT`, `setTenant()`, `useTenant()`; currency, locale, size unit and timezone per tenant | `tenants.jsx` | Every screen renders money and sizes for the selected tenant. In production the list comes from `GET /api/me` and the selection sets the API's tenant scope. |
| **Tenant switcher** in the topbar (FXSA · FXNO · FXFI · ALL) replaces the Quiet/Busy/Crisis pill; breadcrumb shows the tenant name | `shell.jsx` | The memo says the mode toggle disappears in production. Org admins switch tenants; tenant staff see a fixed badge (`canSwitch=false`). |
| **`Money` renders the row's currency or the tenant's** (`R 218 450`, `kr 1 290`, `€ 89`) | `components.jsx` | Three currencies in one console. The API returns minor units + currency; the client divides by 100 and passes `currency` through. |
| **Migration screen** (`#/migration`, under Operations) | `screens/migration.jsx` | Phase 1 needs a place to see import runs, reconciliation checks, module counts, tenant derivation and the source-of-record switch. Data shape = `import.runs / import.checks / import.files`. |
| Tweaks panel removed; mock-data scenario pinned | `app.jsx`, `index.html` | The scenario generator stays only until screens fetch from the API. |
| Runtime vendored (`vendor/`) | `index.html` | Opens from disk; no CDN dependency. |

Everything else in the prototype is untouched. The standalone export `Flexistore Operator Console.html` is the original May 2026 snapshot.

**Brand.** The prototype's tokens (charcoal `#2A2A2A`, carmine `#EF3829`, Montserrat, the box-glyph logo) are the console's identity. The March 2026 master spec's Material 3 / navy / DM Sans direction is superseded by the newer prototype (decision D13, to confirm).

**Roles.** `super_admin` / `admin` / `manager` / `operator` / `viewer` per tenant, `is_org_admin` for group staff. In Phase 1: writes need `operator` or above; staff management, tenant switch to ALL, source-of-record switch need `admin` or `org admin`.

---

## 2. Screen by screen

Legend: **live** = works on imported data in Phase 1 · **read-only** = shows imported data, actions disabled with a phase note · **empty** = the memo's empty-state pattern with the phase named.

### Ops cockpit `#/cockpit` — live (partly)

| Element | Phase 1 | Source |
|---|---|---|
| Greeting + summary line | live: move-ins/outs today, arrears count | `v_cockpit_kpis`, `v_schedule` |
| Mode banner (incident) | empty until Phase 4 (device heartbeat) | `incidents` |
| KPI strip | MRR, outstanding, collected today: live. Bot deflection: shows "AI · Phase 5" | `v_cockpit_kpis` |
| AI proposes | empty state: "Proposals arrive in Phase 5" | `agent_proposals` |
| Facilities live (heat strip) | live: occupancy %, 14-day spark from `unit.status_changed` events | `v_site_occupancy`, `activity_log` |
| Devices & sensors | inventory counts from the last Zoho report; no live status | `devices` |
| Today's schedule | live: move-ins (`started_at = today`), move-outs (`ends_at = today`), tours (leads in `visiting`) | `v_schedule` |
| Live ops feed | live: last hour of `activity_log` (will be mostly delta-sync events until channels and devices exist) | `activity_log` |

### Inbox `#/inbox` — read-only

One conversation per customer with the imported emails, SMS, calls and SalesIQ transcripts as messages. Composer disabled with "Channels go live in Phase 3". "Needs me" and "Bot" tabs are empty by definition. The right rail (customer card, recent activity) is live.

### Customers `#/customers` — live

List: search across name, email, phone, account number; filters site, status, plan size. 360:

| Tab | Phase 1 |
|---|---|
| Overview | KPI mini-strip (lifetime value = settled payments, monthly, open invoices = 0 with "Phase 2" note, door activity from `lock.unlock` events last 7 days, bot resolved = "Phase 5"); AI summary replaced by a plain rule-based summary line; active subscription card; recent communications; quick actions limited to Message (disabled), Add note, Tag, Suspend (writes a flag + activity) |
| Subscriptions | live, "Manage" opens read-only detail |
| Invoices | empty: "Invoices start in Phase 2 — payments are on the Payments tab" |
| Payments *(new tab)* | live: imported payment attempts with method, status, amount, provider ref |
| Communications | live, read-only, points to the Inbox thread |
| Timeline | live: `activity_log` filtered by customer, icon by action family |
| Door access | live for history (`lock.unlock`, key shares); "Share with someone" disabled until Phase 4 |
| Documents | live: re-hosted attachments; upload enabled (object storage) |
| **Legacy (Zoho)** *(new tab)* | the `legacy.contacts` row and everything Zoho-only (offer requests, tasks, visitor stats), read-only |

Writes: contact fields, tags, notes, suspend/reactivate flag. Every write → `audit_log` + `activity_log`.

### Corporate `#/corporate` — empty (Phase 3)

The screen shows the memo's empty state and the two flows' names. `corporate_accounts` exists in the schema so an admin can be created manually via API if needed before Phase 3.

### Leads `#/leads` — live

Kanban with the imported leads (stage per the import rule; `stale_import` losses sit in Lost). Card fields as in the memo; "stuck" dot from `last_touch_at`. Lead modal: contact & need editable, stage picker and Lost reasons live (training signal stored), reply composer disabled (Phase 3), "Send reservation link" disabled (Phase 2), Conversation tab shows chat transcripts, Activity tab live.

### AI activity `#/ai` — empty (Phase 5)

KPIs read 0; the autonomy table lists the capability catalogue with every mode `off` and Adjust disabled.

### Devices `#/devices` — read-only inventory

L0 sites grid (gateway count and last-report status), L1 site: gateways, L2 gateway: boards (from unit wiring), L3 board: locks with unit ids. Live stats, power actions, unlock: disabled with "Phase 4". Spare stock gateways listed under a "Stock" pseudo-site per tenant.

### Facilities `#/facilities` — live (partly)

List cards live (occupancy, MRR, unit-grid mini from unit statuses). Detail:

| Tab | Phase 1 |
|---|---|
| Floor plan | simple grid renderer over the single default zone (no geometry yet); unit colours by status; click → unit panel |
| Units | live table; Edit opens the unit modal with identity, size and notes editable; tier/pricing/hardware fields visible read-only |
| Tech issues | live: create, update status (`tech_tickets`) |
| Devices | same as `#/devices` scoped to the site |
| Landlord & contract | live read-only from `landlords`, `site_agreements` |
| **Legacy (Zoho)** | the property prospect the site came from, deal economics, attachments |

Edit-facility modal: Basics editable; other tabs read-only. New-facility wizard: Phase 4.

### Subs & invoices `#/billing` — live (partly)

Subscriptions and Payments tabs live. Invoices tab empty ("Phase 2"). Pricing tab shows `price_history` from the Norwegian engine as a chart per site/unit type and an empty rules table ("Phase 2").

### Arrears `#/arrears` — live (read)

Open arrears table from `arrears_cases` (derived at import: amount, days overdue from failed attempts, stage). AI reminder / Auction buttons disabled ("Phase 2 / Phase 5"). Auction pipeline and Settings tabs empty.

### Reports `#/reports` — live (partly)

Headline KPIs (MRR, outstanding, average occupancy); MRR 12 months (from subscriptions active per month); churn/new (from `subscription.started` / `subscription.cancelled` events); occupancy per site (12 months from `unit.status_changed`); customer-service and anomalies sections empty (Phase 3/5); saved reports: the daily digest only.

### Migration `#/migration` — new, live

Overview (what is in the PMS for the tenant, cutover checklist), Modules (staged → legacy → core counts), Checks (`import.checks` with PASS/WARN/FAIL), Tenant derivation (`market_source` distribution per table with a review action for `default`), Runs, Legacy browser (Phase 1 M3: table browser over `legacy.*`). "Set PMS as source of record" is the M6 action and requires org admin.

---

## 3. Empty states

The prototype's `Empty` component with one line naming the phase, never a dead button. Copy per screen is in §2. Buttons for future actions stay visible and disabled so the layout matches the target design and operators learn where things will be.

---

## 4. Rendering rules

* Money: `formatMoney(amount, currency)`; symbol from the currency, digits grouped per tenant locale; negatives with a leading minus. Never a bare number for money.
* Sizes: unit `size_value` + `size_unit` per row (`m²` in SA, `m³` in NO/FI), never the tenant default when the row has its own.
* Time: API returns UTC; render in the tenant timezone; relative times ("4m ago") only inside the last 24 hours.
* Ids: `account_number` (`C-…`), `display_name` for units (`FX-SA-0001-0008` in Phase 1; `RBK-D-08` once zones exist), `lead_number` (`L-…`).
* Tenant scope: every list query carries the selected tenant; "ALL" aggregates only where a screen is meaningful across tenants (cockpit KPIs per currency side by side, facilities list, migration) and is otherwise disabled.

---

## 5. From prototype to product

1. Move the JSX to Vite + TypeScript, keep `tokens.css` and the component library (`components.jsx`) as the design system.
2. Replace `window.FXDATA` with TanStack Query hooks per memo endpoint; the mock generators are deleted screen by screen.
3. Add auth (login, TOTP, magic link), route guards by role, tenant scope in every request.
4. Playwright smoke test per screen against staging data as the CI gate (the render check used in this repository is the seed of it).
