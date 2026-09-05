# FXSA — UX planning reference

**Audience:** designer or PM mocking screens for the three FXSA web
surfaces. This doc describes the *capabilities* the API can power
today — every entity, every action, every workflow that's wired up,
in operator-facing vocab.

Pair with:
- `docs/LOVABLE_DATA_CONTRACT.md` — entity/field reference (749 lines)
- `docs/LOVABLE_CONNECTION.md` — auth flows + endpoint shapes
- `GET /api/openapi.json` — machine-readable spec

---

## 0. The three surfaces

Three audiences, three separate Next.js apps, three separate JWT
secrets. A staff member CANNOT use their token on the customer or
owner portal, and vice versa — enforced at the JWT-audience guard.

| Surface | Audience | URL (planned) | Token TTL |
|---|---|---|---|
| **Admin CRM** | Staff (operators, managers, super_admins) | `admin.flexistore.co.za` | 24h access |
| **Customer portal** | Storage renters | `app.flexistore.co.za` | 15min access + 7d refresh |
| **Landlord portal** | Property owners | `owners.flexistore.co.za` | 15min access + 7d refresh |

---

## 1. Admin CRM (`web-admin`) — what an operator can do

### 1.1 Login & session

- **Login screen** — email + password → either gets straight to dashboard, OR if 2FA is enrolled, gets a 6-digit-code prompt
- **2FA enrolment** — settings → "Enable 2FA" → shows otpauth:// QR + secret string → enter the first code to confirm → enabled
- **2FA disable** — settings → enter current code → off
- **Password reset** — "Forgot password" link → email sent if account exists (always shows same success message — POPIA-safe enumeration defence) → click email link → set new password
- **Rate limits:** 10 login attempts per 5min/email; 3 forgot-password per hour/email. UI should surface the `Retry-After` header on 429.

Staff roles: `super_admin`, `admin`, `manager`, `operator`, `viewer`. Role gates control:
- `super_admin / admin` — staff CRUD, all destructive actions
- `manager` — read most things, edit some
- `operator` — day-to-day mutations (notes, tag assignments, record payments)
- `viewer` — read-only

### 1.2 Customer (= Contact) management — the heart of the CRM

Each customer is a **Contact** row. Contact types:
- `individual` — natural person (most common)
- `business` — company with a separate `BusinessAccount` parent

**List view** — searchable table:
- Search by name, email, mobile, account number, ID number
- Columns: account number (FX-NNNNN), name, contactType, status, mobile, email, paymentMethod
- Status badges: `active`, `suspended`, `closed`
- Click into a customer → 360 view

**Customer 360** — the operator's main workspace:
1. **Header** — name, account number, status pill, contactType, "Open since" date, POPIA-consent badge
2. **Tabs** (suggested layout):
   - **Overview** — key fields, address, KYC, payment method, billing contact
   - **Subscriptions** — every storage unit this customer rents (active + historical), per-sub: unit number, site, contracted price, billing day, next invoice date, status
   - **Invoices** — paginated list with totals, status (issued / paid / overdue / waived), invoice PDF link, "record payment" / "send reminder" / "write off" actions
   - **Payments** — every payment received (Paystack + EFT), allocation against invoices
   - **Timeline** (events) — the 30+ event types, chronological, filterable by kind, default 6-month window. Lovable's existing "Customer Activity" is this.
   - **Notes** — operator-typed notes, pinnable, kind=`call|email|meeting|other`, soft-delete
   - **Tags** — assign/remove from the tag catalogue; shows who assigned each
   - **Documents** — uploaded files (ID, lease, proof of payment) in DO Spaces; download via 5-min signed URLs
   - **Communications** — every email/SMS/WhatsApp the system sent this customer (from `communications_log`)
   - **Members** — if `contactType=business`, the secondary contacts who can use the account
   - **POPIA** — view consent timestamp/version, "Export subject data" button (downloads full JSON), "Erasure request" button

3. **Quick actions** (header / sidebar):
   - New subscription
   - Record payment
   - Add note (Ctrl-N)
   - Log support ticket (writes a `support_ticket_logged` event)
   - Suspend / reactivate
   - Send password reset

**Customer create** — modal or page:
- Required: contactType, firstName, lastName, mobile, email, popiaConsentVersion
- Optional: company fields (if business), address, ID number, billing contact, payment method
- POST `/api/customers` → returns the new Contact with auto-assigned `FX-NNNNN` account number

**Customer edit** — PATCH `/api/customers/:id` with any subset of fields
**Customer delete** — soft-delete (DELETE `/api/customers/:id`); shows in red-tinted "deleted" filter, can be restored

### 1.3 Subscriptions — what the customer rents

Each subscription = one customer renting one storage unit.

**List view** — filterable by status, site, customer
- Columns: customer, unit (site + number), contractedPrice, billingDay, status, startedAt
- Statuses: `active`, `notice_given`, `suspended`, `cancelled`, `auction_pending`, `auctioned`

**Subscription detail:**
- Customer link + unit link
- Three prices side-by-side: unit base, current listed, this subscription's contracted (latter is the only one the customer pays)
- Billing day (1–31, with 31→last-day-of-month resolved at runtime)
- Notice given? cancellation date? cancellation reason?
- Discount stack (each discount has an applied amount + reason + auto-expire date)
- Invoice history table
- Linked business account (if any)
- AKS amendment fields: 3-day cancellation notice, auto-renew flag

**Actions:**
- **Create subscription** — pick customer + available unit + start date; `contracted_price` is frozen from current listed price at creation
- **Give notice** — POST `/api/subscriptions/:id/notice { effectiveDate }` (AKS rule: 3 days min)
- **Cancel** — POST `/api/subscriptions/:id/cancel { reason }`
- **Transfer to different unit** — POST `/api/subscriptions/:id/transfer { newUnitId }`
- **Attach discount** — POST `/api/subscriptions/:id/discounts { discountId, percentageOff?, fixedZarOff? }`
- **Remove discount** — DELETE `/api/subscription-discounts/:id`
- **Assign to business account** — POST `/api/subscriptions/:id/assign-business-account { businessAccountId }`
- **Reactivate** — for `suspended` subs only

**Suspended state** — paid past the grace period; door access revoked but data preserved. Reactivation requires payment + manager approval.

### 1.4 Invoices — the money in

**List view** — filterable by status, customer, subscription, date range
- Columns: invoice number, customer, period, total (incl VAT), status, due date, paidAt
- Statuses: `issued`, `paid`, `partially_paid`, `overdue`, `written_off`, `cancelled`
- Bulk actions: send reminders, mark batch paid (rare; usually use individual record-payment)

**Invoice detail:**
- Header: number, customer, period (e.g. "May 2026"), due date
- Line items: each subscription's contracted price, any discounts applied, late fees, credits
- Totals: subtotal / VAT / total
- Payment allocations: which `Payment` rows applied to this invoice, when, by whom
- **Download PDF** — first access renders + stores in Spaces; subsequent fast
- Audit footer: who issued, who recorded payments

**Actions:**
- **Initiate Paystack payment** — POST `/api/invoices/:id/pay` (customer-facing — typically from the customer portal, but admin can use it for a "card payment over phone" workflow)
- **Record manual payment** — POST `/api/invoices/:id/record-payment { paymentMethod, amount, reference, valueDate }` (for EFT, cash, etc.)
- **Apply credit note / write off** — via M17's auction module today; "write off" UI button TBD
- **Re-issue PDF** — wipes Spaces cache, regenerates

**Billing batches** — POST `/api/billing-runs { month, year, asOf? }` — runs the monthly invoice generation for every active subscription billing on day-X of the month. Currently manual; the daily cron is gated by `FXSA_SCHEDULED_BATCHES=false` (will flip to `true` post-go-live).

**Late fees** — POST `/api/late-fee-runs { asOf? }` charges the configured `late_fee_amount_zar` on every overdue invoice past the grace period.

### 1.5 Payments — the money tracking

**List view** — every payment received, with allocation status
- Columns: customer, invoice (if allocated), method, amount, paymentDate, status, reference
- Methods: `card` (Paystack), `eft`, `cash`, `paystack_recurring`
- Statuses: `pending`, `settled`, `failed`, `refunded`, `disputed`

**Payment detail:**
- Source: Paystack txn ID, EFT bank reference, manual entry
- Allocation: which invoice(s) this payment applied to, in what amount
- Webhook payload (for Paystack) — preserved for forensics

### 1.6 Pricing — three-price engine

The platform's core invariant. The admin needs to be able to inspect & manage:

**Pricing bands** — GET/POST/PATCH/DELETE `/api/pricing-bands`
- Per-site, per-unit-type rules that drive automatic listed-price recalc as occupancy changes
- Fields: site, unitType, occupancyThresholdPct, priceMultiplier
- Example: "Brackenfell standard units, ≥90% occupied, price ×1.15"

**Pricing overrides** — `/api/pricing-overrides`
- Operator-set fixed prices that bypass the dynamic engine for a specific unit
- Use case: "this corner unit is worth 20% more than the band says, lock it"

**Pricing recalc** — POST `/api/pricing-recalc`
- Triggers a recompute across all sites; auto-fires on subscription create/cancel/move-out

**Scheduled increases** — UI for the 60/30/7-day customer-notice flow
- An operator schedules "contract price +5% from 2026-07-01 for customers X, Y, Z"
- System emits notice events at 60/30/7 days out and applies on the effective date

### 1.7 Discounts

**List view** — `/api/discounts` (catalogue)
- Columns: name, type (percentage/fixed), value, default expiry, isActive
- Actions: create, edit, archive

**Per-subscription application** — from the subscription detail page
- Stack-aware (multiple discounts on one sub)
- Auto-expires per the configured rule

### 1.8 Sites (= facilities) & units

**Site list** — GET `/api/sites` — 11 sites today (post-M14c import)
- Columns: name, city, address, WhatsApp number, operating hours, unit count
- Click → site detail with units

**Site detail:**
- Address + operating hours
- Owner agreements (which landlords get revenue-share from this site)
- Units tab — GET `/api/sites/:id/units`
- Zones tab — GET `/api/sites/:id/zones` (physical zones for door access)

**Unit list / detail** — GET `/api/units`
- Columns: site, unit number, type, size, current status, listed price, base price
- Statuses: `available`, `occupied`, `on_hold`, `maintenance`, `decommissioned`, `auction_pending`
- Click → see the current subscription (if any), historical subscriptions, price history

**Zones + doors** (M16) — GET `/api/sites/:id/zones`, `/api/zones/:id/doors`
- Each door has an NFC tag; tap events flow into the event stream
- Currently no UI for door registration — admin uses POST `/api/zones/:id/doors`
- Phase 2 will add live door-control (Kerong locks via FX Gateway)

### 1.9 Reservations

**List view** — `/api/storage/reservations`
- Customer wants a unit but hasn't paid yet
- Statuses: `pending`, `payment_in_progress`, `converted`, `expired`, `abandoned`
- Auto-expire cron picks up stale pending reservations

**Actions:**
- Cancel: POST `/api/storage/reservations/:id/cancel`
- Claim (convert to subscription): POST `/api/storage/reservations/:id/claim`
- Bulk expire stale: POST `/api/admin/reservations/expire`

### 1.10 Collections (= arrears management)

**Arrears dashboard** — GET `/api/arrears`
- Every customer with an overdue balance, aged buckets (0–30, 31–60, 61–90, 90+)
- Total outstanding (incl/excl VAT), days past due, last contact attempt
- Drill into a case

**Collections cases** — GET `/api/collections-cases`
- One open case per customer in arrears
- Status: `open`, `payment_arranged`, `legal`, `auction_pending`, `resolved`
- Notes thread, contact log, manager-assignment

**Dunning runs** — POST `/api/collections-runs` (sends reminders), `/api/retry-cascade-runs` (Paystack auto-retry D+1/3/7/14)

### 1.11 Auctions (M17)

When a customer's arrears go past the legal threshold, their contents go to auction.

**List view** — GET `/api/auction-items`
- Columns: unit, customer, reservePriceZar, status (`pending_listing`, `listed`, `sold`, `unsold`), saleDate, soldZar
- Per-item actions: mark listed, mark sold (with proceeds), mark unsold

### 1.12 Business accounts (B2B)

A `BusinessAccount` is a parent for multiple subscriptions + multiple users (members).

**List view** — GET `/api/business-accounts`
- Columns: company name, VAT number, billing contact, subscription count, member count, status

**Detail:**
- Linked subscriptions (assign/unassign from individual sub pages)
- Members list — GET `/api/business-accounts/:id/members`
  - Each member: contact info, role (`admin` | `member`), inviteStatus (`pending` | `accepted` | `revoked`)
  - Actions: invite (sends email), resend invite, revoke

### 1.13 Property owners (= landlords)

**List view** — GET `/api/owners`
- Columns: name, type (individual/company), portal email, # of sites, revenue YTD

**Detail:**
- Sites this owner gets revenue-share from
- Per-agreement: revenue-share %, fixed monthly amount, lease terms
- Portal account: email, isActive, last login
- Banking details (encrypted at rest; staff can view, decryption logged)
- Document tab (lease PDFs etc.)

**Actions:**
- Create owner
- Add/edit site agreement
- Activate portal access (sends signup link)
- Reset portal password (sends reset link)

### 1.14 Payouts

**Payout runs** — GET `/api/payout-runs` — one per month
- Lists all owner advices generated for the month
- Status: `draft`, `approved`, `paid`
- Click → per-owner breakdown

**Per-owner advice** — POST `/api/payout-run-owners/:id/advice`
- Renders PDF, emails to the owner
- Shows allocated payments × revenue-share %

**Actions:**
- Trigger run: POST `/api/payout-runs { month, year }`
- Approve: POST `/api/payout-runs/:id/approve` (gate before paying)
- Re-send advice: POST `/api/payout-run-owners/:id/advice { force: true }`

### 1.15 POPIA admin

**Subject access** — `/admin/popia/subject-access/:contactId`
- Operator-initiated full export of a customer's data; downloadable JSON

**Erasure requests** — `/admin/popia/erasure-requests`
- Queue of customer requests
- Per-request: status (`received | in_review | approved | rejected | purged`), submitter, reason
- Actions: approve (starts 30-day cooldown), reject (with notes), trigger early purge
- SARS-retention guard: contacts with settled payments can't be auto-purged — flagged for manual anonymisation

**Audit trail** — there's no UI yet but `staff_audit_trail` has every staff mutation. Suggested view: filterable timeline of who-did-what-when, action + entity + outcome. Build later.

### 1.16 Xero exports

**Export runs** — GET `/api/xero-exports`
- Per-run status, # invoices, # payments, errors
- Re-run is idempotent (won't double-export)

### 1.17 Communications log

**List view** — GET `/api/communications-log`
- Every outbound email/SMS/WhatsApp the system sent
- Columns: contact, channel, messageType, subject (if email), sentAt, providerStatus, deliveredAt

### 1.18 System config

**Settings page** — GET/PATCH `/api/system-config`
- VAT rate, late-fee amount, grace period days, billing-day divisor, dynamic-pricing rounding, erasure retention days, etc.
- Audit every change (it's a staff mutation)

### 1.19 Staff management

**List/create/edit staff** — `/auth/staff*`
- Only `super_admin` and `admin` can manage
- Per-staff: email, role, isActive, 2FA enabled, last login

### 1.20 Cockpit dashboard (not yet built)

Operator's home screen. Suggested widgets:
- Today's expected revenue (sum of invoices due today)
- Units available right now (per-site)
- Open collections cases / arrears total
- Pending reservations expiring today
- Recent communications failures
- Recent failed staff actions (audit-trail tail)

API needed: `GET /api/admin/cockpit/summary` — TBD; ~30 LOC to add.

---

## 2. Customer portal (`web-customer`) — what a customer can do

### 2.1 Public surface

- **Landing / browse** — see units available at each site (GET `/api/sites`, GET `/api/sites/:id/units?status=available`)
- **Unit detail** — size, price, photos, "Reserve" button
- **Reserve flow** — pick a unit + start date → creates a Reservation → redirect to Paystack
- **Signup** — POST `/api/auth/customer/signup` (firstName, lastName, email, mobile, password, popiaConsentVersion)
- **Login** — POST `/api/auth/customer/login`
- **Forgot/reset password** — POPIA-safe enumeration defence

### 2.2 Authenticated surface

- **My account / profile** — GET `/api/auth/customer/me` → editable name, mobile, billing address, notification prefs
- **My subscriptions** — GET `/api/customers/:meId/subscriptions` → list of units I'm renting
  - Per-sub: unit, site, price, billing day, "Give notice" button (subject to AKS 3-day rule)
- **My invoices** — GET `/api/invoices?contactId=:meId`
  - Per-invoice: status, total, due date, "Pay now" button → Paystack
  - Download PDF
- **My payments** — read-only history
- **Documents** — view/download my lease, ID, etc.
- **Verify email** — flow if not yet verified (banner + link from welcome email)
- **POPIA self-service:**
  - `GET /api/me/data-export` → downloads my full data
  - `POST /api/me/erasure-request { reason }` → submits a right-to-be-forgotten request

### 2.3 Reservation → subscription conversion flow

1. Customer picks unit, fills profile, clicks reserve → Reservation row, `status='pending'`
2. Redirect to Paystack for first payment
3. Paystack webhook → Reservation flips to `status='converted'`, Subscription created
4. Welcome email + access info sent
5. Customer arrives, gets door access

---

## 3. Landlord portal (`web-owner`) — what a property owner can do

### 3.1 Login & profile

- Login: POST `/api/auth/owner/login`
- Forgot/reset password — same shape as customer
- View profile: GET `/api/auth/owner/me`

### 3.2 Read-only views

- **My facilities** — GET `/api/sites?ownerId=:meId` (filter shipped this session)
  - Per-site: occupancy %, revenue this month, lease terms
- **My payouts** — GET `/api/payout-runs` (filter client-side for now)
  - Per-payout: month, total, breakdown per site, status, advice PDF download
- **Statements / agreements** — view lease PDF, escalation history

### 3.3 No write access

Landlord portal is read-only by design (per spec). Any operational
change goes through the admin team.

---

## 4. Cross-surface concerns

### 4.1 Money rendering

- **All amounts** are stored as integer ZAR in the DB (e.g. `120000` = R1,200.00) — divide by 100 for display
- **VAT-inclusive vs exclusive** — invoices show `totalInclVat` + `totalVat` + `subtotalExclVat`. Lead with `totalInclVat` (what customer owes).
- Locale: `en-ZA`, R as currency symbol, comma as thousands separator.

### 4.2 Dates & time

- API returns ISO 8601 UTC strings — `2026-05-24T14:30:00.000Z`
- Render in `Africa/Johannesburg` (no DST) on the FE
- Billing day stays as set even when it doesn't exist in the month (31→last-day-of-Feb); the resolver runs server-side, FE just shows the resolved date

### 4.3 Statuses & badges (visual taxonomy)

Suggested colour-coding (matches FXSA brand):

| Status family | Good | Watch | Bad |
|---|---|---|---|
| Subscription | active (green) | notice_given, suspended (amber) | cancelled, auctioned (grey/red) |
| Invoice | paid (green) | issued, partially_paid (blue) | overdue, written_off (red) |
| Payment | settled (green) | pending (amber) | failed, disputed (red) |
| Customer | active (green) | suspended (amber) | closed (grey) |
| Unit | available (green) | on_hold (amber) | occupied (blue), maintenance, decommissioned (grey) |
| Erasure request | purged (grey) | received, in_review, approved (amber) | rejected (red) |

### 4.4 Event timeline taxonomy

The unified `/events` feed surfaces ~30 event types. Suggested icon + colour map for the timeline UI:

| Group | Examples | Icon hint |
|---|---|---|
| Lifecycle | customer_signup, subscription_created, subscription_cancelled | 👤 / 📋 |
| Money in | payment_received, recurring_payment, payment_recovered | 💰 (green) |
| Money problems | payment_failed, payment_problem, late_fee_charged | ⚠️ (amber/red) |
| Pricing | pricing_recalc, scheduled_increase_applied | 📈 |
| Reservations | reservation_pending, reservation_converted, reservation_expired | 🗓️ |
| Owner / payout | payout_run_created, payout_advice_sent | 🏦 |
| Members | business_member_invited, business_member_accepted | 👥 |
| Door (Phase 2) | door_unlocked, door_alarm_breach | 🚪 |
| CRM | support_ticket_logged | 💬 |

### 4.5 Pagination

Not implemented today — every list endpoint returns up to N rows (N varies). Lovable et al should design for cursor-based pagination; we'll add `?limit=&cursor=` when call sites need it.

### 4.6 Search

- Customers: `GET /api/customers?q=<text>` — fuzzy match across name/email/mobile/account
- Other entities: filter-only today, no text search. Easy to add per-entity when there's a UI need.

### 4.7 Error handling

- 401 → redirect to login
- 403 → "You don't have permission for this action" (RolesGuard rejection)
- 404 → entity-not-found page
- 429 → "Too many attempts — try again in {retryAfterSeconds}s" (Retry-After header)
- 500 → generic error; include the X-Request-Id in the support form so we can correlate to logs

### 4.8 Real-time / live updates

Not built. Every page is request/response. If you need "auto-refresh the cockpit every 30s," that's client-side polling — no SSE/WebSocket yet.

### 4.9 Empty states

Critical for the Phase-1 launch since several surfaces are intentionally blank:
- **Staff jobs page** — no jobs module exists. Empty state should say "Work orders are not in Phase 1."
- **Leads page** — no leads module. Same treatment.
- **Devices / anomalies page** — Phase 2 (Kerong locks via FX Gateway).
- **Cockpit dashboard** — until the aggregation endpoint exists, show widgets that source from existing endpoints (arrears, units, collections) and a placeholder for the aggregate.

---

## 5. What's NOT yet build-able from the API

These need backend work before a designer can mock real screens:

| Surface | Missing endpoint |
|---|---|
| **Leads pipeline** | No `leads` module. Decision: build or defer to Phase 2? |
| **Staff jobs / work orders** | No module. Same decision. |
| **Devices / anomalies** | Phase 2; door events are in `/events` but no device registry |
| **Cockpit aggregations** | `GET /api/admin/cockpit/summary` — design the fields, then I build (~30 LOC) |
| **Audit trail viewer** | `staff_audit_trail` is populated since M21c; no public endpoint yet (read-only `/api/admin/audit-trail`?) |
| **Real-time alerts** | No WebSocket / SSE; polling is fine for Phase 1 |
| **Live door control** | Phase 2 (Kerong + FX Gateway) |

---

## 6. Brand / visual identity

Per the spec + AGENT.md:
- **Primary:** navy `#1A3C5E`
- **Tertiary / accent:** orange `#E8501A`
- **Type:** DM Sans (display/headline), Inter (body/label)
- **System:** Material Design 3
- **Components library planned:** `packages/ui` — exports `Button`, `TextField`, `DataTable`, `Money`, `Badge`, `DateField`. Currently scaffold-only; build out alongside the first real screens.

---

## 7. Suggested page-build priority order

If we're greenlighting actual screen work (option B from the earlier conversation), here's a sane order:

**Sprint 1 — operator can log in and see customers:**
1. Login (with 2FA prompt path)
2. Customer list + search
3. Customer 360 — Overview + Subscriptions + Invoices tabs
4. Add note / log support ticket quick actions

**Sprint 2 — operator can take money + check status:**
5. Invoice detail + record-payment modal
6. Payment list
7. Arrears dashboard
8. Communications log

**Sprint 3 — pricing + lifecycle:**
9. Subscription create / edit / cancel
10. Site list + unit inventory
11. Discount catalogue + per-sub attach
12. Pricing bands + scheduled increases

**Sprint 4 — landlord facing:**
13. Owner CRUD
14. Payout runs + per-owner advice PDF
15. Landlord portal (login, my facilities, my payouts)

**Sprint 5 — customer portal:**
16. Customer signup + login
17. Browse units → reserve → Paystack
18. My account / my subscriptions / my invoices / pay-now
19. POPIA self-service (export + erasure request)

Each sprint is ~3–5 days of FE work given the API is already there. After sprint 5 you have a fully functional, demonstrable platform.
