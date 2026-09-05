# Zoho import specification

How the Zoho CRM backup becomes (a) the `legacy` schema, unchanged in meaning, and (b) the parts of the core model that have a home for it. The analysis of the backup itself is `docs/source/ZOHO_BACKUP_CRM_IMPORT_SPEC_2.md`; this document is the executable interpretation of it, implemented in `tools/zoho-import`.

---

## 1. Pipeline

```
manifest ─▶ stage ─▶ preflight ─▶ transform legacy (100–220) ─▶ transform core (300–399) ─▶ validate
```

| Step | Input | Output | Idempotent |
|---|---|---|---|
| `manifest` | backup folder | `manifest.json`: file → module, sha256, csv-parsed row count, header, sanitised columns; unmapped files; attachments dir | yes |
| `stage` | CSVs | `zoho_raw.<module>` (all text) + `import.files` | drops and recreates staging tables (`--append` to add a delta) |
| `preflight` | transform contracts | fails on missing required columns; adds NULL columns for missing optional ones; applies `aliases.json` renames | yes |
| `transform legacy` | `zoho_raw` | `legacy.*` (truncate + insert per module) | yes |
| `transform core` | `legacy` | `public.*` (one ordered truncate of the tables it fills, then inserts) | yes, full reload |
| `validate` | everything | `import.checks` rows; exit 1 on any `error` | yes |

Module registry (file pattern → staging table → tier): `tools/zoho-import/zoho_import/config.py`. Unknown files are staged under a name derived from the file name and reported as unmapped; nothing in the folder is ignored.

---

## 2. Header contract

CSV headers are Zoho **labels**. They become column names by: lower-case; runs of non-alphanumerics → `_`; leading/trailing `_` trimmed; `.id` lookup columns get `__id`; leading digit gets `_`; duplicates get `_2`, `_3`.

| Label | Column |
|---|---|
| `Record Id` | `record_id` |
| `Facility.id` (Zoho lookup) | `facility__id` |
| `Facility ID` (backend uuid) | `facility_id` |
| `Bod / Unit Name` | `bod_unit_name` |
| `Size (m2/m3) - Calculated` | `size_m2_m3_calculated` |
| `0.5 sqm` | `_0_5_sqm` |
| `Contact AppUser.id` | `contact_appuser__id` |

Each transform declares `-- requires:` (hard) and `-- optional:` (soft) columns. The labels used were taken from the backup analysis; where the analysis did not quote a label, the transform lists plausible variants as optional and coalesces them (for example `mailing_street`/`street`, `mobile`/`phone`, `sent_to`/`to`). A mismatch therefore produces an empty column and a `fill` warning in `validate`, never a crash, and is fixed by an alias:

```json
{ "contacts": { "mailing_street": "street_1" } }
```

Every legacy row also stores the complete source row in `extra jsonb` (except `date_of_birth`, `guest_wifi_password` and `attachment_name`), so a column that was missed can be mapped later from `legacy` without re-staging.

---

## 3. Transformation rules

### 3.1 Types

| Rule | Function |
|---|---|
| Empty string → NULL | `import.nz` |
| Booleans `true/false`, `TRUE/FALSE`, `True/False`, `1/0`, `yes/no` | `import.zoho_bool` |
| Timestamps are **SAST** (`Africa/Johannesburg`, UTC+2, no DST); accepted forms `YYYY-MM-DD HH:MM[:SS]`, ISO `T`, `DD/MM/YYYY [HH:MM]`; fractions and explicit offsets stripped | `import.zoho_ts` → `timestamptz` |
| Timestamps that are already UTC: `SMSes.Submitted`, JSON `created` inside `AppEvents.Details`, `Share Start/End` | `import.utc_ts` |
| Pure dates stay dates (`Order Start Date`, `Due Date`, `Commission Date`) | `import.zoho_date` |
| Money strings (`1354.5`, `R 1,354.50`) | `import.zoho_num` (legacy, numeric) → `import.minor` (core, bigint) |
| Zoho ids: `Record Id` and `*.id` are `zcrm_…`; `SMSes.ObjectID` lacks the prefix | `import.zoho_prefix` |
| Country free text (`Norway`, `Norge`, `norge`, `South Africa`, `RSA`, …) → ISO alpha-2 | `import.country_iso` |
| Phone → E.164 using the row's market (SA `0…`→`+27…`, NO 8 digits→`+47…`, FI `0…`→`+358…`); ambiguous → NULL, raw kept | `import.phone_e164` |
| `AppEvents.Details`: JSON object → jsonb; `"k":"v"` lines → jsonb; prose → `details_raw` | `import.parse_details` |
| Card numbers `XXXX-XXXX-XXXX-4242` → last 4 | `right(regexp_replace(…),4)` |

### 3.2 Market → tenant

Never from `Organisation` alone (untagged before 2025). Priority per table:

| Table | Order |
|---|---|
| facilities | Country → Currency Code → Organisation → default |
| units, reservations, payment_details | facility |
| payments | currency (ZAR/NOK/EUR) → reservation → default |
| contacts | Financial Tool (Xero=SA, PowerOffice=NO) → market of the contact's latest reservation (by Contact AppUser.id or User ID) → country (mailing / signup) → Organisation → owner's Zoho role (Manager South Africa, …) → default |
| gateways | facility → Add State (`Stock South Africa`, `Stock Norway`) → Orginisation → default |
| leads | Country → matched contact → default |
| old contacts, properties (legacy module) | SA by module |
| calls | contact → line number (`+27 21 490 0922` = SA, `+47 23 50 00 57` = NO) → none |
| communications, emails, smses, notes, tasks, offer requests, attachments | via the linked reservation/contact/facility/prospect |
| app_events | facility uuid → reservation → unit → contact → default |
| property prospects, business partners | Country (`Organisation` on partners is a country) → default |

`default` is NO (the Zoho org owner's market). `market_source` records which rule fired; `validate` reports the `default` share per table and fails nothing on it, so the operator reviews the list in the Migration screen.

### 3.3 Contact populations

| Population | Rule | Goes to |
|---|---|---|
| `app_user` | `App User = true` or `AppUser UUID` present | `customers` |
| `partner_contact` | `Business Partner Contact = true` | `customers` (flag `partner_contact`) |
| `customer` | has a reservation, or has email/phone and is not a visitor stub | `customers` |
| `lead_match` | email matches a Lead | `customers` |
| `web_visitor` | `Visitor Score` / `First Visit` present, or neither email nor phone | `legacy.contacts` only |

Orphans: reservations whose `User ID` matches no contact (2.4% in the analysis: deleted app accounts) get a placeholder customer with the backend uuid as id, `source='zoho-orphan'`, status closed.

### 3.4 Reservations

All 27,214 rows land in `legacy.reservations`. Then:

* `Payment Status ∉ {UNPAID, PENDING}` → `subscriptions` (id = Reservationid). Price = Discounted Price (list = Price); discount % derived; `billing_day` = day of start date; `ends_at` = LastOccupationDate → Order End Date for ended rows; status per `02-DATA-MODEL.md` §4.2; everything Zoho-specific (modifiers, comm-sent dates, card, platform raw, order status) → `subscriptions.legacy` jsonb.
* `Payment Status ∈ {UNPAID, PENDING}` → `reservations` (`abandoned` / `pending`).
* `Ordered Items` is used only to backfill the unit link when `Storage Unit` is empty.
* `units.current_subscription_id` = the unit's `reservationId`, else the latest live subscription on the unit; occupied units without a live subscription are reported by `validate` as a warning.

### 3.5 Payments

`Test = true` rows are kept in legacy (`is_test`) and never mapped. Method/provider/status maps are in `02-DATA-MODEL.md` §4.3. Amount: captured (settled) or declined/authorised (failed), so a failed attempt keeps the amount it tried to take. The Zoho/Stripe/Paystack payload stays in `payments.raw`.

### 3.6 Status histories

Zoho gives durations, not timestamps. `unit_status_history.entered_at` is reconstructed by walking each unit's chain backwards from the unit's `Modified Time` (the latest transition) and is flagged `reconstructed = true`; the `activity_log` payload carries `timestamp_reconstructed: true`. Reservation status history (`Status History Gads`) has Zoho timestamps but only from Dec 2025.

### 3.7 Event log

`legacy.app_events` (partitioned) → `activity_log` with the action map in `02-DATA-MODEL.md` §4.4. Actor is `customer` for customer-initiated types with a user id, `operator` for support/admin types, otherwise `system`. Target and denormalised keys (customer, subscription, unit, site) are resolved from the backend uuids. `SYSTEM_NOTIFY` price notices are additionally parsed into `price_history` with unit type, new price, occupancy before/after and multiplier.

### 3.8 Communications

* `Communications` (backend notifications) → `activity_log` actions `notification.<event>`; customer rating/feedback kept in the payload.
* `Emails` → messages (channel email, outbound, system); the ones on Communications resolve the customer through the notification; opens/clicks/bounces in `meta`.
* `SMSes` → messages (Reply → inbound from the customer; Sent/Delivered/Failed → outbound).
* `Calls` → messages (channel phone; Missed as inbound with `meta.missed = true`).
* `Notes` titled "Zoho SalesIQ chat …" → messages (channel chat); other notes → `notes` on the customer.
* One `conversation` per customer (and per lead with chat transcripts), `status = closed`, `subject = "Imported history"`.

### 3.9 What stays legacy-only

Property prospects and their status history, unit-mix, business partners other than property owners, offer requests (NO/FI insurance and moving add-ons), tasks, campaigns' Zoho metadata, SalesIQ visitor stubs, Zoho metadata (field map, picklists), gateway country history, AppEvents × Gateways, the dead Properties module (flagged). The console shows them under the **Legacy (Zoho)** tab of the related site/customer/unit or in the Migration screen's Legacy browser.

### 3.10 What is dropped at import

`Guest WiFi password` (same value on 47 sites), `Emails.Attachment Name` (mail metadata blob), Zoho system columns that only exist in `extra` (`Layout.id`, `Tag`, `Locked`, `Record Status`, scores, `Exchange Rate`, Zoho `Currency`). Date of birth is imported only with `--import-dob`.

---

## 4. Validation

`import.checks(run_id, stage, name, expected, actual, passed, severity, detail)`:

| Stage | Check | Severity |
|---|---|---|
| staging | rows per staging table = csv-parsed rows in the manifest | error |
| legacy | rows per table = analysis counts (only with `--expect-full-backup`; otherwise info) | error / info |
| legacy | no row without tenant on facilities, units, contacts, reservations, payments | error |
| legacy | `market_source = 'default'` ≤ 5% per table | warn |
| legacy | FK resolution rates (units→facilities, reservations→units/facilities/contacts, payments→reservations, status history→units) within the analysis tolerances | error (User ID: warn) |
| legacy | timestamps within range | error |
| legacy | SA slice counts | info / warn with full backup |
| core | sites = facilities; units = units; customers = non-visitor contacts; subscriptions = non-draft reservations; reservations = drafts; payments = non-test payments; activity_log ≥ app events | error |
| core | occupied units have a current subscription | warn |
| legacy | fill rate > 0 on key mapped columns (header-mismatch detector) | warn |

---

## 5. Delta sync (Phase 1, to build)

Same code path, different source:

1. For each module, Zoho Bulk Read with criteria `Modified_Time > <cursor>`; results are CSVs with the same labels as the backup.
2. `stage --append` into the same `zoho_raw` tables (header check against the first load).
3. Legacy transforms in **upsert** mode (`on conflict (zoho_id) do update`) — the transform files are written as truncate + insert for the initial load; the sync wrapper rewrites them to upserts by replacing the `truncate` and adding an `on conflict` clause, or the files are parameterised with `{{MODE}}` when the sync is built.
4. Core upserts on `(tenant_id, source, source_ref)`.
5. Nightly id sweep per module → soft-delete rows whose `Record Id` disappeared.
6. Cursor per module stored in `import.runs.summary`.

Confirmed Zoho API module names: `Price_Books` (Facilities), `Products` (Bods / Units), `Sales_Orders` (Reservations), `Contacts`, `Payments`, `Payment_Details`, `AppEvents`, `AppEvents_X_Gateways`, `Communications`, `Gateways`, `Property_Agreements` (Property Prospects), `Business_Partners`, `bulksmscom__SMSes`, `OfferRequests`, `Leads`, `Calls`, `Tasks`, `Notes`, `Campaigns`, `Attachments` via the related-records API. The legacy `AppUsers` and `Properties` modules are no longer visible in the org and exist only in the backup.
