# Decision log

Decisions taken in this plan, with the alternative that was rejected and the confidence in the choice. Open questions at the end need an answer from the business before the phase that depends on them.

## Taken

| # | Decision | Rejected alternative | Why | Confidence |
|---|---|---|---|---|
| D1 | The operator-console UX memo is the source of the core data model; Zoho is loaded as legacy data and mapped one way | Design the schema from the Zoho modules | Zoho mirrors the Norwegian backend and encodes its quirks (two status fields, abandoned checkouts as orders, no invoices). The memo describes what operators need. Legacy stays queryable in full. | high |
| D2 | Shared Postgres schema, `tenant_id` everywhere, RLS, tenant-scoped composite foreign keys | Database per tenant | Group needs cross-tenant staff and reporting; composite keys + RLS give hard isolation; a tenant can still be moved out later because every row is tenant-keyed | high |
| D3 | Money as bigint minor units + currency per row | `decimal(12,2)` (master spec v3) | Three currencies in one database; integer arithmetic is exact; matches the planning reference's existing API contract | high |
| D4 | Zoho SalesOrders split: paid/active/ended/blocked → `subscriptions`; UNPAID/PENDING → `reservations` | One table with a Zoho status column | The memo has both concepts; abandoned checkouts are not tenancies and would corrupt MRR/churn | high |
| D5 | Event firehose into `activity_log` (partitioned), mapped to the memo's action vocabulary, raw type kept | Separate warehouse / drop it | The customer timeline and unit history need it in place; 2.1M rows is small for Postgres; partitions keep it cheap | high |
| D6 | Finland imported as a third tenant | Import SA + NO only | It is in the same backup (2 facilities, EUR payments, gateways); leaving it out orphans rows and delays a decision that costs nothing now | moderate |
| D7 | Phase 1 replaces Zoho as the CRM after a parallel run; the Flexistore app backend stays operational until Phases 2–4 | Replace the backend first | The backend owns billing and locks; replacing it is Phases 2 and 4 by definition. Replacing Zoho first removes a licence, a mirror and an unowned schema | high |
| D8 | Delta sync from Zoho via Bulk Read on `Modified_Time` until cutover | One-shot load + freeze | Operators keep working during the build; the backend keeps writing to Zoho | high |
| D9 | Date of birth imported only with `--import-dob`; addresses imported | Import everything | POPIA/GDPR minimisation; SA KYC already happened in SumSub; DOB has no Phase 1 use | high |
| D10 | Unit timeline timestamps reconstructed from durations and flagged | Leave `entered_at` null | Occupancy history over 12 months is a Phase 1 report; the reconstruction is exact relative to the last transition and is marked as reconstructed | moderate |
| D11 | Imported leads older than 30 days at snapshot are `lost` with `loss_reason_code = 'stale_import'` | Import all 2,746 as `new` | A kanban with 2,700 "new" cards is unusable; the code is explicit and reversible | moderate |
| D12 | Imported emails/SMS/calls/chats become messages in one closed conversation per customer | Keep them only as activity events | The memo's inbox and customer Communications tab expect messages; the backend notifications stay events | moderate |
| D13 | Prototype design tokens (charcoal `#2A2A2A`, carmine `#EF3829`, Montserrat) are the brand for the console | Master spec v3 tokens (navy `#1A3C5E`, orange `#E8501A`, DM Sans/Inter, Material 3) | The prototype (May 2026) is newer than the spec (March 2026) and ships with the brand SVG; the user named the UX as the master | moderate — confirm |
| D14 | Devices modelled as one tree table with `kind` + `attrs` | One table per device kind | The memo's four-level drill-down is a tree; Zoho only has gateways + unit wiring; new kinds (sensors, lights, UPS) must not need migrations | moderate |
| D15 | Core stage of the backup importer is a full reload; delta syncs are upserts | Everything upsert from day one | Simpler and safer before cutover; after cutover the importer is not run again | high |
| D16 | Application language: TypeScript across API and web | Python API | One language for a three-person team; the prototype is React; no data-science workload in Phases 1–4 | moderate — revisit if the existing FXSA API is reused and is not TypeScript |

## Open — answer needed before the phase in brackets

| # | Question | Recommendation | Phase |
|---|---|---|---|
| O1 | Does the partially built FXSA API described in the planning reference exist in a usable state, and in what language? | Inspect it in Phase 2 planning; if it is sound, port its billing/Paystack/Xero/payout modules onto this schema rather than rebuilding | 2 |
| O2 | WhatsApp provider (Meta direct vs a BSP) and business verification ownership | Meta Cloud API direct if FXSA can complete business verification; otherwise a BSP with template management | 3 |
| O3 | VAT treatment of insurance, software fee and auction income (SA) | Accountant confirms before invoice lines for those products are enabled | 2 |
| O4 | EFT door-suspension threshold (day 10 vs day 4 for cards) and who may approve EFT accounts | Day 10; `admin` and above | 2 / 4 |
| O5 | Kerong/StorPro API documentation and the Flexilock RPi protocol | Get both; Phase 4 is decoupled so this does not block 2, 3, 5 | 4 |
| O6 | Are Norwegian and Finnish operations going to run billing on this platform (Stripe/Vipps/PowerOffice adapters) or stay on the existing backend? | Decide after Phase 2 for SA is live; the adapters are scoped as Phase 2b | 2b |
| O7 | Confirm the brand tokens (D13) | Product owner | 1 |
| O8 | Retention period for Zoho after cutover and who owns the archive | 12 months, read-only, org owner | 1 M6 |
| O9 | Customer reassignments between tenants (a Norwegian who rents in SA): one customer per tenant (current) or a group-level identity? | Keep per-tenant customers; add a group identity only if a real case appears | 6 |
| O10 | Object storage provider for documents (memo says DigitalOcean Spaces) | Any S3-compatible bucket in the same region as the database | 1 M5 |
