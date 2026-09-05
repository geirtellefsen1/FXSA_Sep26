# Flexistore CRM — engineering memo

A page-by-page spec for the operator console MVP. Each section lists **what the user sees**, **what they can do**, the **state the UI keeps**, the **data shape** it expects from a backend, and the **API endpoints / integrations / events** that should exist to make it real.

This doc is written so a back-end engineer (or Claude Code) can wire the existing JSX to a real system without guessing intent.

> **Stack assumptions for handoff.** UI is React 18 with inline JSX through Babel-standalone. Mock data is in `data.jsx` (`window.FXDATA`) and `data-hardware.jsx` (`window.FXHARDWARE`). Every screen reads from these globals; replacing them with `fetch()`-backed equivalents (or a TanStack-Query layer) is the cleanest port. The "mode" tweak (`quiet` / `busy` / `crisis`) is the prototype's stand-in for live state — in production it just disappears.

---

## Conventions

- **Money** is always South African Rand, integer cents in the backend, displayed as `R 12 345`.
- **Time** is `Africa/Johannesburg` (UTC+02:00), no DST, **ISO 8601 with offset** in transit.
- **Phone** stored E.164 (`+2782…`), displayed local-spaced.
- **Site IDs** are short strings (e.g. `rosebank`, `bellville`, `cellars`). Public-facing facility short codes are 3-letter prefixes (`RBK`, `BVL`, `CLR`) used as unit-ID prefixes.
- **Unit IDs** = `{SITE_SHORT}-{ZONE}-{NUMBER}` e.g. `RBK-D-08`. The system must accept either the full ID or `(siteId, unitNumber)` tuples.
- **Customer ID** = `C-{seq}` (`C-24551`). **Lead ID** = `L-{seq}`. **Invoice** = `INV-{YYYYMM}-{seq}`.
- **Soft-delete only** for customers, units, facilities. Hard-deletes restricted to admin + audit logged.
- **Every state-changing action emits an event** on the `activity_log` bus (`actor`, `action`, `target`, `payload`, `ts`). The activity tabs all read this bus filtered by target.
- **AI actions** are first-class — they all flow through an `agent_proposal` table with `status: pending|approved|rejected|expired`. Approving fires the underlying side effect. Rejecting trains the model.

---

## 1. Ops cockpit  `#/cockpit`

### What it is
The 06:30 start-of-day landing page for Geir & Adam. Everything urgent surfaces here so the rest of the app is read-on-demand.

### Visible elements & what they do
- **Greeting line** — pulls operator's first name + summary line built from today's counters.
- **Mode banner** — when an unresolved Incident is open, this is a red call-to-action linking to AI activity.
- **KPI strip (4 tiles)** — MRR, outstanding arrears, collected-today, bot deflection rate. Deltas are vs the same weekday last week.
- **AI proposes** — top 3–4 pending agent proposals (the rest live in `/ai`). Each card has `Approve · {action verb}`, `Adjust`, `Dismiss`. Approving = POST to the proposal's underlying side-effect endpoint and mark proposal status `approved`.
- **Facilities live (heat strip)** — every site as a card with severity dot, occupancy %, 14-day spark. Click → `/facilities/{siteId}`.
- **Devices & sensors snapshot** — 4 mini-tiles (online / degraded / offline / anomalies) + list of any device with `status !== 'good'`. Click → `/devices/{siteId}`.
- **Today's schedule** — move-ins, move-outs, tours due today, with status flag (KYC pending etc).
- **Live ops feed** — last-hour rolling activity, mixed human + AI.

### State the UI keeps
- `mode` (tweak only, gets removed for prod)
- Selected site or device when navigating away.

### Data needed
```
GET /api/cockpit
→ {
    greeting: "Good morning, Geir",
    summary: "1 active incident · 3 devices offline · 14 escalations to triage.",
    kpis: {
      mrr_zar: 218450, mrr_delta_pct: +4.2,
      outstanding_zar: 24750, outstanding_count: 9,
      collected_today_zar: 31200, payments_today: 14, payments_failed: 6,
      bot_deflection: 0.73, bot_handled: 38, bot_escalated: 14,
      devices_online: 29, devices_total: 36, devices_degraded: 4, devices_offline: 3,
      moveins_today: 5, moveouts_today: 0, occupancy_avg: 0.84
    },
    incident: { id, severity, headline, link } | null,
    site_health: [ { site_id, occupancy_pct, spark_14d: [.81,...], severity } ],
    proposals: [ AgentProposal, ... ],   // top 4
    schedule_today: [ ScheduleItem, ... ],
    live_feed: [ ActivityEvent, ... ]    // last hour
  }
```

### Events the cockpit listens to (SSE / websocket)
- `proposal.created`, `proposal.resolved`
- `device.status_changed`
- `payment.settled`, `payment.failed`
- `customer.access_event` (filtered to schedule items + flagged)

### Endpoints to wire
- `POST /api/agent/proposals/{id}/approve`
- `POST /api/agent/proposals/{id}/reject`
- `POST /api/agent/proposals/{id}/adjust` (returns a new editable draft)
- `GET /api/cockpit/refresh` (manual refresh button)

---

## 2. Inbox  `#/inbox`

### What it is
**Unified** conversation list across WhatsApp Business, email, and the website chatbot. One thread per customer regardless of channel — back-end work is to merge channel-specific threads under `customer_id`.

### Visible elements & what they do
- **Left list (360px)** — All / Needs me / Bot tabs. Card per conversation: avatar, name + subject, last message snippet, time, channel chip, badges (`Urgent`, `Needs me`, `Bot handling N msgs`, `Bot resolved`), unread count pill.
- **Centre thread** — Chronological messages with sender pill (Customer / AI assistant / Operator), timestamp, channel; attachments rendered as paperclip chips. Special **escalation marker** for bot-to-human handoffs.
- **Composer** — Textarea pre-filled with an AI suggestion when one exists. Chips above show "AI drafted · 94% confidence · 12 matched cases". `Discard` removes the draft. Send-as line lists the channel + sender identity.
- **Right rail (340px)** —
  - Customer card (uses different layout for leads vs. customers)
  - AI suggests block — 2–4 tappable buttons specific to the thread (e.g. *Send Paystack card-update link*, *Pause dunning 48h*, *Remote-unlock door for Megan*).
  - Recent activity — last ~5 events for this customer (payments, door access, KYC).

### Routing model
- Inbound message → `messages` table with `(channel, channel_message_id, customer_id, body, attachments[], inbound, sent_at)`.
- Threading: one **conversation** per `customer_id` (or per `lead_id` if no customer yet). Subject is derived from first message or AI-classified topic. **No per-channel threads.**
- Bot vs human authorship: `author_kind` ∈ `{customer, agent_ai, operator}`. The bot has its own user-like identity (`flexistore-ai`).

### Data shape
```
Conversation {
  id, customer_id | lead_id, channels: ['whatsapp','email','chat'],
  subject, last_message_at, unread_count,
  status: 'urgent' | 'awaiting-operator' | 'bot-handling' | 'bot-resolved' | 'closed',
  bot_handled_count: int,
  messages: [Message],
}
Message {
  id, conversation_id,
  channel: 'whatsapp' | 'email' | 'chat',
  author_kind, author_id, sent_at,
  body, attachments: [{name, url, mime, size}],
  reply_to_message_id? // for email threading
}
```

### Endpoints
- `GET /api/inbox?status=needs_me|bot|all&site=&q=` → paginated.
- `GET /api/inbox/{conversation_id}` → full thread + customer/lead context.
- `POST /api/inbox/{conversation_id}/messages` body `{channel, body, attachments[], from_draft_id?}`. Server hands off to **Channel Adapter** (WhatsApp Business Cloud API for `whatsapp`; SES/Mailgun for `email`; internal pubsub for `chat`).
- `POST /api/inbox/{conversation_id}/status` body `{status, reason?}` — manual override.
- `GET /api/ai/draft?conversation_id=...` → `{body, confidence, matched_case_ids[]}`.
- `POST /api/ai/draft/{id}/discard` — used to train against false positives.

### AI behaviour
- Inbound msg → AI classifier picks intent + writes a candidate reply, attached as a **draft** to the conversation.
- If `confidence >= autonomy.threshold` and capability is `autonomous` → bot auto-replies and updates `status='bot-handling'`.
- If `confidence < threshold` OR capability is `approve` → conversation goes to `awaiting-operator` and shows up under "Needs me".
- Escalation marker emitted as a system message in the thread with `escalated_reason`.

### Integrations
- **WhatsApp Business Cloud API** (Meta) — send approved-template messages outside the 24h customer-service window; freeform within. Need verified business + a long-lived token; phone number `+27 21 49 00 922`.
- **Email** — SES/Mailgun. Reply-to is `support@flexistore.co.za`. Threading via `In-Reply-To` header + custom `X-Flexistore-Conversation-Id`.
- **Chatbot** — embed on `flexistore.app`; messages POST to `/api/chat/incoming` with session token mapping to `customer_id` after login.

---

## 3. Customers (B2C)  `#/customers`

### What it is
The CRM heart for individual customers (B2B sits in **Corporate**). List → 360° profile.

### List
- Searchable across `first|last|email|phone|account_id`.
- Filters: site, status (active / arrears / suspended / closed), plan size.
- Columns: customer, account, site·unit, plan m², monthly R, status badge, last contact.

### 360° view (per `customer_id`)
**Header** carries: avatar, full name, status badges (Arrears, Active, B2B, KYC verified, "Customer since"), all comm channels.
**Mini KPI strip** (5 tiles):
- **Lifetime value** — sum of all settled invoices.
- **Monthly** — current subscription total.
- **Open invoices** — count + R amount.
- **Door activity** — count last 7d + traffic-light if abnormal.
- **Bot resolved** — count of bot-handled threads.

**Tabs:**
- **Overview** — AI summary (free-text generated from the customer's signals, plus a suggested action if relevant); Active subscription card; Recent communications (last ~4 across channels with status); Quick actions list (Message / New invoice / Remote-unlock unit / Add note / Tag / Suspend); Tags; Xero link.
- **Subscriptions** — One row per unit the customer rents; unit · site · plan · monthly · status · started · next bill · "Manage" → opens unit-edit modal.
- **Invoices** — Full invoice history with status (Paid / Overdue / Pending / Retry D+N) and "Record payment" inline action.
- **Communications** — Pointer back to Inbox filtered for this customer.
- **Timeline** — Chronological merge of every door event, payment, KYC, subscription, comms with icon by kind.
- **Door access** — Last-7-days events from the access bus + digital keys (shared) list with expiry, "Share with someone" action.
- **Documents** — Lease PDF, ID document, proof-of-address. Drag-and-drop upload.

### Data shape
```
Customer {
  id, kind: 'individual'|'business',
  first, last, email, phone,
  kyc: { status, provider:'sumsub', provider_ref, verified_at },
  tags: [string],
  xero_contact_id,
  created_at,
  subscriptions: [Subscription],
  documents: [{type, url, uploaded_at}],
  flags: {arrears, suspended, vip_priority}
}
Subscription {
  id, customer_id, unit_id, site_id,
  plan_size_sqm, price_zar, discount_pct,
  started_at, ends_at?, next_bill_at,
  status: 'active'|'paused'|'closed',
  notice_at?, notice_reason?
}
```

### Endpoints
- `GET /api/customers?q=&site=&status=&plan=&page=`
- `GET /api/customers/{id}` → 360° bundle including subs, recent invoices, recent comms refs.
- `PATCH /api/customers/{id}` — name, email, phone, tags.
- `POST /api/customers/{id}/notes` (see Notes section below).
- `POST /api/customers/{id}/suspend` `/reactivate` `/close`.
- `GET /api/customers/{id}/timeline?from=&to=`
- `GET /api/customers/{id}/access_events?days=7`
- `POST /api/customers/{id}/keys/share` body `{phone, expires_at, unit_ids[]}`.

---

## 4. Corporate (B2B)  `#/corporate`

### What it is
One paid subscription, many units, many users, one consolidated invoice. The admin user manages access on the customer side; CS reflects all of it.

### List
Company, admin, units, users, billing mode, MRR, status.

### Detail tabs
- **Overview** — AI summary; Units snapshot (first 5); Users snapshot (first 6); Admin card; Customer portal links (web `app.flexistore.co.za`, WhatsApp `+27 21 49 00 922 · text 'admin'`); Quick actions.
- **Units** — Every unit with internal label (e.g. "Archive — Marketing 2024"), cost code (e.g. `DG-OPS-01`), allocated users (avatar stack), monthly. **Allocate** opens the user picker.
- **Users & access** — Every user with role (admin / manager / member), unit scope ("All N units" or chips for unit IDs), invite method, last access, status (Active / Invite sent / Revoked). **Access** action → role + unit-scope editor.
- **Billing & reconciliation** — Consolidated monthly invoice with one line per unit + cost code; subtotal, B2B-discount line, VAT 15%, total. 6-month reconciliation table: invoiced vs received vs delta vs matched-status.
- **Activity** — Admin + member + AI + system actions chronologically.

### Two creation flows (both CS-side AND admin self-serve via portal / WhatsApp)
- **Add unit modal** — Site picker (AI suggests based on user locations), size chip selector (4/8/10/16/20 m²), internal label / cost code, initial users (chip toggles). On submit: reserve unit + send activation WhatsApp + email.
- **Invite user modal** — Name, mobile, email, role, scope (all units / selected). Send fires WhatsApp + email + optional calendar invite.

### Data shape
```
CorporateAccount {
  id, name, industry, vat_number, brand_color, short_logo,
  billing_email, billing_phone, status,
  billing_mode: 'consolidated'|'per_unit',
  payment_terms_days, billing_day_of_month,
  requires_po: bool, cost_codes_enabled: bool,
  discount_pct, xero_contact_id,
  admin_user_id,
}
CorporateUser {
  id, account_id, name, email, phone,
  role: 'admin'|'manager'|'member',
  all_units: bool, unit_ids: [],
  status: 'active'|'pending'|'revoked',
  invited_via: 'manual'|'whatsapp'|'email'|'portal'|'whatsapp+email',
  last_access_at, invited_at, accepted_at
}
CorporateUnit {
  subscription_id, account_id, unit_id, site_id,
  internal_label, cost_code,
  user_ids: [], size_sqm, price_zar, started_at, status
}
```

### Endpoints
- `GET /api/corporate?status=&q=&sort=mrr|name`
- `GET /api/corporate/{id}` → bundle
- `POST /api/corporate/{id}/units` (add new) body `{site_id, size_sqm, label, cost_code, initial_user_ids[]}`
  - On success: reserve unit, create subscription line on the consolidated invoice, send WA+email to listed users, emit activation event.
- `POST /api/corporate/{id}/users` body `{name, email, phone, role, all_units, unit_ids[]}`
  - Server sends WhatsApp (one-time link + verification code) + email (password setup) via Channel Adapter.
- `PATCH /api/corporate/{id}/users/{uid}/access` body `{role?, all_units?, unit_ids?[]}`
- `POST /api/corporate/{id}/invoices/{invoice_id}/reconcile` body `{payment_id}`
- `GET /api/corporate/{id}/reconciliation?months=6`

### Customer-portal counterparts
- `POST /api/portal/account/units` and `/users` — same flows but auth as admin user (Bearer token from admin login).
- WhatsApp shortcut: when admin texts `admin` to the business number, bot replies with menu — "1. Add unit · 2. Invite user · 3. View invoice · 4. Pay now". Each option opens a guided WhatsApp flow that ultimately hits the same endpoints.

---

## 5. Leads  `#/leads`

### What it is
Kanban of prospective customers. AI qualifies and replies; operator picks up stuck or high-value.

### Lanes (6)
`new → contacted → qualified → visiting → reserved → lost`. Each lane shows count + pipeline value.

### Card
Name (★ admin marker if recurring), site preference, size m², potential MRR value, age, last touch, source icon (whatsapp / globe / user / users / sparkles). Red dot when "stuck" (no response 4d+).

### Lead modal (click a card)
- **Detail tab**
  - **Contact & need** — name, source, mobile, email, preferred site, size, move-in/out dates. Inline-editable.
  - **Stage picker** — pill row for stages + a `Lost` button. Picking `Lost` reveals "Why lost?" dropdown (Chose competitor / Price too high / Wrong location / Wrong size / No longer needs / Ghosted). This is the model's training signal — store it.
  - **Reply composer** — channel pills (WhatsApp / Email / Phone), pre-filled draft, Suggest button, Send reservation link button, Send.
  - **Right rail**: AI suggests (Send reservation + Paystack / Book self-tour / Schedule operator call); Conversion stats (score, days in pipeline, last touch, channel).
- **Conversation** — full thread with the lead.
- **Activity** — Lead lifecycle events.

### Data shape
```
Lead {
  id, name, email?, phone?,
  source: 'whatsapp'|'website'|'walk-in'|'referral'|'google-ads',
  site_id?, size_sqm_pref?, move_in_pref?,
  value_estimate_zar,
  stage, age_days, last_touch_text,
  score: 0..100,
  notes: [Note],
  conversation_id?,
  conversion: { converted_to_customer_id, converted_at } | null,
  loss: { reason_code, reason_text, lost_at } | null
}
```

### Endpoints
- `GET /api/leads?stage=&site=&q=`
- `GET /api/leads/{id}` → full + conversation pointer
- `PATCH /api/leads/{id}` — contact fields, preferences
- `POST /api/leads/{id}/stage` body `{stage, reason?}`
- `POST /api/leads/{id}/reservation` body `{unit_id, hold_minutes:30}` → returns Paystack pre-auth link
- `POST /api/leads/{id}/convert` body `{customer_id}` — links to a new customer record
- `POST /api/leads/{id}/lost` body `{reason_code, reason_text?}`

### AI behaviour
- New lead → AI classifier scores intent + matches to inventory + drafts intro reply.
- Auto-progresses `new → contacted` upon reply.
- Auto-flags `stuck` after 4d no response, surfaces in cockpit.

### Source integrations
- **Website forms** (Webflow/Next): POST to `/api/leads/incoming` with referrer + UTM.
- **WhatsApp**: messages without an existing customer/lead → new lead created server-side.
- **Google Ads**: gclid forwarded to `/api/leads/incoming` for attribution.

---

## 6. AI activity  `#/ai`

### What it is
Audit and tuning surface for the agent. Three KPIs (autonomous actions, deflection rate, pending approval), pending proposal list, today's activity feed, agent autonomy table.

### Agent autonomy table
Per capability: mode (Autonomous vs Asks operator), confidence threshold (decimal 0..1), 7-day count, **Adjust** button → modal to flip mode / change threshold.

Capabilities the table covers:
```
reply_routine_chat           // WhatsApp / chat / email intent matches
send_payment_reminder_gentle // 1st reminder, day 7
send_payment_reminder_firm   // 2nd/3rd + card retry
reissue_kyc_link
adjust_listed_price_pct_10
remote_unlock_customer_unit
issue_refund_small (≤R 1 000)
issue_refund_large (>R 1 000)
cancel_subscription
dispatch_technician_to_site
power_cycle_poe_segment
push_listing_to_ibid
issue_winner_key_to_auction_buyer
```

### Data shape
```
AgentCapability {
  id, label, mode: 'autonomous'|'approve',
  threshold: 0..1,
  description,
  last7d_count, last7d_outcome: {approved, rejected, adjusted}
}
AgentProposal {
  id, capability_id, created_at, expires_at,
  status: 'pending'|'approved'|'rejected'|'adjusted'|'expired',
  title, rationale_markdown, confidence,
  affects: [{kind:'customer'|'unit'|'site', id, label}],
  expected_impact_text,
  payload: <capability-specific>,
  severity?: 'bad'|'watch'|null
}
ActivityRow {
  id, ts, kind, desc, detail,
  confidence?, severity?,
  cust_id?, site_id?, channel?,
  actor: 'ai'|operator_id
}
```

### Endpoints
- `GET /api/agent/proposals?status=pending&limit=`
- `POST /api/agent/proposals/{id}/approve` — fires side-effect, returns receipt
- `POST /api/agent/proposals/{id}/reject` body `{reason?}` — training signal
- `POST /api/agent/proposals/{id}/adjust` body `{patch}` — operator-edited payload, then approved
- `GET /api/agent/activity?from=&to=&kind=&site=`
- `GET /api/agent/capabilities`
- `PATCH /api/agent/capabilities/{id}` body `{mode?, threshold?}`

### Side-effect endpoints (called by approved proposals)
Each capability has one. Examples:
- `POST /api/payments/{invoice_id}/reminder` body `{template, channel}`
- `POST /api/pricing/{site_id}/listings/{type}/adjust` body `{delta_pct, ttl_days}`
- `POST /api/access/units/{unit_id}/unlock`
- `POST /api/auctions` (iBid push)
- `POST /api/devices/{gateway_id}/poe/{port}/cycle`

---

## 7. Devices  `#/devices`

### What it is
4-level drill-down from sites grid to a single lock port. Built around the actual hardware stack:

```
UDM Pro (per site)
 └─ PoE port 1..8
     └─ Site Gateway (Kerong KR-A165) — one per zone
         └─ RS-485 daisy chain (max 3 hubs per gateway)
             └─ Kerong KR-CU16 Hub
                 ├─ Lock ports 1..16 → solenoid → unit door
                 ├─ AUX bus → environmental sensors
                 └─ 24V rail → LED lighting circuits
```

### Levels
- **L0 sites grid** — by region (Cape Town, Johannesburg, Paarl, Stellenbosch, Mbombela). Card shows UDM model, IP, uptime, issue count.
- **L1 site detail** — UDM Pro card (live CPU/mem/throughput/PoE budget/WAN/MAC), gateway grid, wiring SVG. Power controls: reboot UDM, cycle all PoE.
- **L2 gateway detail** — Gateway live stats, table of hubs (RS-485 addr, daisy position, locks/sensors/lights count, last ping). Power: reboot gateway, **cycle PoE port N** with blast-radius confirm.
- **L3 hub detail** — Tabs **Locks** (16-port grid showing unit ID per port + per-port unlock/cycle/history), **Sensors** (AUX), **Lights** (24V), **Wiring** (full chain visualisation).

### Power-action confirm modal
Every action with blast > one device:
- **Blast radius** banner — text listing affected customers/units.
- **AI pre-flight** — checks the next 10 min of schedule. If any move-ins / tours, offers to WhatsApp "back in 30s" heads-up.
- "Log this action with reason" checkbox.

### Data shape
```
Site (network view) {
  id, name, region, udm: UDM,
  gateways: [Gateway],
  totals: {gateways, hubs, locks, sensors, lights}
}
UDM {
  model, ip, mac, firmware, uptime,
  wan, throughput_mbps_5min, clients,
  cpu_pct, mem_pct, poe_budget_w_used, poe_budget_w_total
}
Gateway {
  id, model: 'KR-A165', mac_suffix, ip, firmware,
  status: 'good'|'watch'|'bad', last_ping_text, latency_ms?, uptime_pct,
  zone_label, zone_id, poe_port, poe_wattage_text,
  hubs: [Hub]
}
Hub {
  id, model: 'KR-CU16 16-port', firmware, rs485_address,
  status, last_ping_text, power_draw_text,
  is_master: bool, daisy_chain_pos: 1|2|3,
  locks: [Lock], sensors: [Sensor], lights: [Light]
}
Lock { id, port:1..16, unit_id, status, last_event_text }
Sensor { id, port, kind: 'temp'|'humidity'|'smoke'|'motion', label, value, status }
Light { id, port, label, state:'on'|'off'|'auto', wattage, status }
```

### Endpoints
- `GET /api/devices/sites` → grid
- `GET /api/devices/sites/{site_id}` → UDM + gateways + wiring
- `GET /api/devices/gateways/{gateway_id}` → live + hubs list
- `GET /api/devices/hubs/{hub_id}` → locks/sensors/lights
- `POST /api/devices/udms/{site_id}/reboot`
- `POST /api/devices/gateways/{gateway_id}/reboot`
- `POST /api/devices/gateways/{gateway_id}/poe/{port}/cycle` body `{reason, notify_affected:true}`
- `POST /api/devices/hubs/{hub_id}/reboot`
- `POST /api/devices/locks/{lock_id}/cycle`
- `POST /api/devices/locks/{lock_id}/unlock` body `{actor_id, reason}` — logged in lock_events
- `GET /api/devices/{id}/history?metric=ping|uptime&from=&to=`

### Integrations
- **Ubiquiti UniFi controller** (self-hosted on UDM Pro at HQ + per-site UDMs) — REST API for UDM stats. Service account, long-lived cookie auth.
- **Kerong management gateway** (HTTP API on each `KR-A165`) — POST commands `unlock_port`, `cycle_port`, `reboot`. Uses RS-485 to relay to slave hubs.
- **PoE relay** — UDM PoE per-port toggle via UniFi API (`POST /api/s/default/cmd/devmgr {cmd:'poe-power', mac:..., port:..., poe_mode:'auto'/'off'}`).

### Eventing
- `device.status_changed` (heartbeat watcher polls every 60s; anomaly detection flags `bad` after 2 missed pings, `watch` on latency > 100ms sustained 60s).
- `lock.event` (unlock, denied, brute-force) — flows to anomaly engine.

---

## 8. Facilities  `#/facilities`

### What it is
Operational view of each location, plus the floor-plan map customer service uses to direct customers.

### List
Card per facility with occupancy %, MRR, mini unit-grid, severity badge.

### Detail tabs
- **Floor plan** — Interactive SVG: zones, units coloured by status (occupied/available/reserved/maintenance), VIP gold rim, red issue dot, aisles, device pins. Hover → tooltip. Click → side panel.
  - **Side panel** (right) varies by selection:
    - **Site overview** (default) — Counts (occupied/available/reserved/maintenance + VIP), live issues list, open tickets list.
    - **Unit panel** — Header + key facts + **Edit** button → opens unit modal (see below). Quick actions: Open customer 360 / Message / Remote-unlock / Add note / Log tech issue.
    - **Device panel** — Live status, key network facts, **Quick actions** (re-sweep, power-cycle, ping history, log issue).
- **Units tab** — Table; every row has **Edit** opening the unit modal.
- **Tech issues tab** — Tickets list; new ticket modal.
- **Devices tab** — Same drill-in as `/devices` but scoped to this site.
- **Landlord & contract tab** — Lease, rev-share, payouts.

### Unit modal (edit, opens from anywhere)
Fields:
- **Identity**: number (e.g. `08`), display name, size value + unit (`m²`/`m³`).
- **Tier**: `normal | climate | vip`.
- **Pricing**: `normal_price_zar`, `vip_price_zar`. **VIP rule**: when a customer explicitly books VIP, charge `vip_price`. When system silently allocates a VIP unit because the customer's tier is sold out, charge `normal_price` and don't tell them.
- **Hardware**: `lock_model` (KR-100 / KR-200 / KR-300 climate / Manual), `sensor` (Door / Door+motion / Door+motion+temp / None), `light` (Aisle shared / Per-unit motion / Always on / None).
- **Wiring**: hub id, hub port (1..16), gateway id, gateway PoE port.
- **Distance**: meters from entrance (for app walking directions).

### Edit facility modal (admin only)
Tabs: **Basics / Lease & landlord / Pricing & VIP rules / Security / Network & power / Danger zone**. Danger zone holds Suspend access, Move all subscriptions, Decommission (each requires Adam's sign-off).

### New facility wizard (5 steps)
1. **Basics** — name, short code (3 letters), city, region, address, GPS, hours; landlord + lease.
2. **Unit catalog & pricing** — Free-form list of unit types (any name, any size, any unit `m²` / `m³`). Per type: avg size, count, features (comma-separated), R/m². Each row has a **Configure N units** button → per-unit configurator (override number, name, VIP flag, lock/sensor/light, hub/port, gateway/PoE, meters from door).
3. **Doors · code each one** — Per-unit table; every door fully coded; mark VIP individually; auto-wire then override.
4. **Infrastructure** — WAN, UDM, electrical (mains/phases/DBs/UPS/genset/solar/load-shedding strategy), CCTV, alarms.
5. **Launch checklist** — 6 categories of items (Legal / Build-out / Electrical / Network / Access / Go-live), donut progress, target soft + public launch, financial summary (CapEx, OpEx, break-even, payback), AI pre-create offer (UniFi site, Kerong hub map, Xero contact, iBidOnStorage seller record, marketing landing page).

### Data shape
```
Facility {
  id, name, short_code, city, region, address, gps, hours,
  landlord: {name, contact, lease_start, lease_term, rent_zar, rev_share_pct, escalation_pct, notice_months},
  area: {gross_m2, lettable_m2, efficiency_pct, floors, ceiling_m, loading_kg_m2},
  vip_allocation_mode: 'silent-upgrade'|'explicit-only'|'always-vip',
  pricing_defaults: {b2b_pct, student_pct, move_in_promo},
  security_config: {...},
  network_config: {udm_model, wan, lan_subnet, gateways_target, hubs_target},
  power_config: {phases, dbs: [DB], ups, genset, solar, ls_strategy},
  zones: [Zone],
  status: 'planning'|'soft-launch'|'live'|'paused'|'decommissioned',
  created_at, launched_at?
}
Unit {
  id, facility_id, zone_id, number,
  display_name, size_value, size_unit:'m2'|'m3',
  tier: 'normal'|'climate'|'vip',
  normal_price_zar, vip_price_zar,
  lock_model, sensor_kind, light_kind,
  hub_id, hub_port, gateway_id, gateway_poe_port,
  meters_from_entrance,
  status: 'available'|'occupied'|'reserved'|'maintenance',
  current_subscription_id?
}
TechTicket {
  id, facility_id, unit_id?, device_id?,
  subject, priority: 'low'|'medium'|'high'|'critical',
  channel, customer_text, customer_id?,
  status: 'open'|'investigating'|'resolved',
  notes, age_text, created_at, resolved_at?
}
```

### Endpoints
- `GET /api/facilities` → list
- `POST /api/facilities` — new facility (full wizard payload). Side-effects: create UniFi site, register Kerong gateway record, create Xero subsite, register iBid seller record.
- `GET /api/facilities/{id}` → bundle
- `PATCH /api/facilities/{id}` — basics / lease / pricing / security / network
- `POST /api/facilities/{id}/decommission` — admin + Adam sign-off
- `POST /api/facilities/{id}/units` — create unit (bulk-create from wizard).
- `PATCH /api/units/{unit_id}` — full unit fields
- `POST /api/units/{unit_id}/reserve` body `{customer_id, hold_minutes}`
- `POST /api/facilities/{id}/tickets` body `{subject, priority, unit_id?, device_id?, notes, link_type, channel}`
- `PATCH /api/tickets/{id}/status` body `{status, resolution_note?}`

---

## 9. Subs & invoices  `#/billing`

### What it is
Geir's money screen. Invoices, subscriptions, payments, dynamic pricing.

### Tabs
- **Invoices** — Search, filter by status (Paid / Overdue / Pending / Retry), period filter, export. Columns: invoice #, customer + unit, period, subtotal, VAT, total, status, due, action (`Remind` if overdue).
- **Subscriptions** — Customer / site·unit / started / monthly / discount / status / next bill / Manage.
- **Payments** — Paystack settlements + EFT + declines with Retry inline. Reference, method, customer, amount, status, time.
- **Pricing** — Per-site / per-type list with occupancy band + AI pricing recommendations (drop/raise X% with rationale, expected MRR impact).

### Data shape
```
Invoice {
  id, customer_id|account_id, subscription_ids[],
  number, period_start, period_end,
  lines: [{description, unit_id, cost_code?, quantity, unit_zar}],
  subtotal_zar, discount_zar, vat_zar, total_zar,
  status: 'paid'|'overdue'|'pending'|'retry',
  due_at, paid_at?, retry_attempt?, last_payment_id?,
  xero_invoice_id
}
Payment {
  id, invoice_id, customer_id,
  method: 'paystack-card'|'paystack-eft'|'manual-eft',
  amount_zar, status: 'settled'|'failed'|'pending'|'reversed',
  provider_ref, provider_message?, received_at
}
PricingRule {
  site_id, unit_type, listed_price_per_sqm,
  band: 'high-demand'|'normal'|'under-utilised',
  override_active_until?, override_pct?
}
```

### Endpoints
- `GET /api/invoices?status=&period=&q=`
- `POST /api/invoices/{id}/reminder` body `{template}` — bulk-safe
- `POST /api/invoices/{id}/payments` body `{method, amount_zar, ref}` — record manual
- `POST /api/invoices/{id}/retry` — force Paystack retry
- `GET /api/payments?status=&from=&to=`
- `GET /api/pricing/rules?site=`
- `POST /api/pricing/rules/{id}/override` body `{delta_pct, ttl_days, reason}` — AI proposals route through here

### Integrations
- **Paystack** — recurring auth + retry; webhooks for settled/failed → `/api/webhooks/paystack`.
- **Xero** — invoice + contact sync (every successful payment → POST Xero invoice ID).
- **Bank EFT** — daily import (Stitch/Mono) → match by reference → propose reconciliation.

---

## 10. Arrears  `#/arrears`

### What it is
Recovery workflow + iBidOnStorage auction pipeline.

### Tabs
- **Open arrears** — AI triage summary; aging buckets 0–30 / 31–60 / 61–90 / 90+; cases table with stage (`gentle | firm | arranged`); inline `AI reminder`; `Auction` button (from day 60).
- **Auction pipeline** — 6 lanes: At risk (60–89d) · Legal notice · Photo inventory · Live on iBid · Soft close · Closed.
- **Settings** — Thresholds (default 60 days legal notice, 90 days auction), pricing rules (`reserve = max(arrears + R500, AI suggested)`), AI autonomy per step, iBidOnStorage seller record + API key + webhook.

### Auction detail (6-tab modal)
- **Overview** — Lifecycle timeline.
- **Inventory & photos** — Photo grid (upload from phone via QR / drag-drop / pull CCTV snapshot); AI-generated description.
- **iBid listing** — JSON payload to `POST /api/v1/auctions` + preview of how it looks on iBidOnStorage.
- **Bids** — Live bid feed (top bid, unique bidders, region, soft-close timer).
- **Key handover** — Winner contact, payment escrow status, single-use 7-day digital key issuance, cleaning deposit refund tracking.
- **Legal trail** — Every step with channel + PDF evidence (gentle → firm → access revoked → pre-auction notice → 14-day final → listed).

### Data shape
```
ArrearsCase {
  customer_id, subscription_id, amount_zar, days_overdue,
  attempts, stage:'gentle'|'firm'|'arranged'|'pre-auction',
  status:'active'|'arranged'|'auctioned',
  history: [{ts, action, channel, doc_url?}],
  access_revoked_at?, legal_notice_sent_at?
}
Auction {
  id, customer_id, unit_id, days_overdue, amount_zar,
  stage:'at-risk'|'notice'|'inventory'|'listed'|'closing'|'closed',
  reserve_zar, starting_bid_zar, photos: [url],
  description, listed_at?, closed_at?, ibid_listing_id,
  bids: [{bidder_id, when, amount_zar, region}],
  top_bid_zar, bid_count, ends_at,
  sold:bool, sold_for_zar?, winner: {name, ibid_handle, phone, email}?,
  handover: {key_issued_at, deposit_refund_status, pickup_window}?
}
```

### Endpoints
- `GET /api/arrears`
- `POST /api/arrears/{customer_id}/dunning` — fire batch (manual or scheduled)
- `POST /api/arrears/{customer_id}/promote-auction` — manual escalate
- `POST /api/auctions` — push to iBid (sends listing payload)
- `POST /api/auctions/{id}/photos` — upload + auto-attach
- `POST /api/auctions/{id}/description` — AI-generated or manual
- `POST /api/auctions/{id}/cancel` body `{reason}` — customer paid
- `POST /api/webhooks/ibid` — receives bid events, sold events, payment confirmation
- On payment confirmation: server auto-issues single-use key via `POST /api/access/units/{unit_id}/issue-key` to winner phone.

### Integrations
- **iBidOnStorage SA** API — seller account `flexistore-sa`. Endpoints: `POST /auctions`, `POST /auctions/{id}/photos`, webhook `payment_confirmed`. 17.5% buyer's premium, soft-close +2 min, R 500 cleaning deposit.
- **DigitalOcean Spaces** — photo storage, pre-signed URLs in the API payload.
- **Sheriff service** (optional next phase) — for unsold relists / disposal.

---

## 11. Reports  `#/reports`

### What it is
The auto-digest. Numbers Geir & Adam check most.

### Sections
- **Headline KPIs**: MRR, outstanding, avg occupancy, bot deflection.
- **MRR · 12 months** bar chart.
- **Churn / new** — side-by-side bars + commentary line ("Net +21 · 2.5% growth").
- **Occupancy per site** — Trend sparklines, move-ins/outs, net, MRR.
- **Customer service this month** — Bot-handled, escalated, resolution rate, avg first-reply.
- **Anomalies this month** — Failed payments, door failures, KYC stuck, brute-force, suspicious access.
- **Saved reports** — Scheduled email digests with `Send now` button.

### Endpoints
- `GET /api/reports/snapshot?month=YYYY-MM`
- `GET /api/reports/saved`
- `POST /api/reports/saved` body `{name, schedule, recipients, query}`
- `POST /api/reports/saved/{id}/send-now`

### Scheduling
Daily 06:30 `morning ops digest`. Weekly Mon 09:00 `arrears review`. Monthly 1st `P&L by site`. Monthly 5th `landlord payouts`. Weekly Fri `AI agent performance`.

---

## Cross-cutting: Notes

A note is a stickable piece of operator/AI context. Notes are first-class because they feed AI suggestions.

```
Note {
  id, target: {kind:'customer'|'unit'|'device'|'facility', id},
  body_md, author_kind, author_id, created_at,
  pinned: bool, ai_consumed: bool
}
```

`POST /api/notes` body `{target, body, pinned?}`. Every page surfaces "Add note (Cmd+N)" — the underlying request is the same.

---

## Cross-cutting: Activity log

Single append-only stream. Every screen's "Activity" tab is a filtered view of this.

```
ActivityEvent { id, ts, actor_kind, actor_id, action,
  target: {kind, id}, payload, severity? }
```

Common `action` strings:
`customer.created, customer.kyc_verified, customer.access_event,
 subscription.started, subscription.cancelled, subscription.notice_given,
 invoice.issued, invoice.reminded, payment.settled, payment.failed,
 lead.created, lead.stage_changed, lead.lost,
 corporate.unit_added, corporate.user_invited, corporate.user_access_changed,
 device.status_changed, device.power_cycle, lock.unlock, lock.denied,
 ticket.created, ticket.resolved,
 auction.listed, auction.bid, auction.sold, auction.key_issued,
 agent.proposal_created, agent.approved, agent.rejected, agent.adjusted}`

---

## Cross-cutting: Channel Adapter

One service that talks WhatsApp / Email / SMS. All other services post messages here.

```
POST /api/channel/send
{ to: {customer_id|phone|email},
  channel: 'whatsapp'|'email'|'sms',
  template_id?: string,        // mandatory for WhatsApp outside 24h window
  body?: string,
  attachments?: [{name,url,mime}],
  conversation_id?: string,
  idempotency_key }
```

Returns `{message_id, provider_ref, status:'queued'|'sent'|'delivered'|'failed'}`.

Inbound webhooks:
- `POST /api/webhooks/whatsapp` — Meta Cloud API.
- `POST /api/webhooks/email/inbound` — Mailgun / SES.
- `POST /api/chat/incoming` — internal.

---

## Cross-cutting: Auth, roles, audit

- Operator console users: `super_admin` (Geir), `admin` (Adam), `support` (future). Magic-link login + 2FA.
- Customer portal users: customer + corporate sub-users. WhatsApp-bound login (verify number → one-time link).
- Every write endpoint takes an `Idempotency-Key`. Every state change is audit-logged.
- Sensitive actions (suspend/revoke/decommission/dispatch tech/issue refund > R 1000) require step-up auth.

---

## Cross-cutting: Mode (prototype only)

The Quiet / Busy / Crisis tweak in the topbar exists in the prototype to demo cascading state across pages. **Strip it out for prod** — the data and proposal feeds drive real states by themselves.
