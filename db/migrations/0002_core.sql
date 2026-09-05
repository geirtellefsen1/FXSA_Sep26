-- ============================================================================
-- 0002  Core model — derived from the operator-console UX (ux/prototype/MEMO.md)
--
-- One table per data shape in the memo, made multi-tenant. Conventions:
--   * uuid PKs; tenant_id on every row (RLS in 0005).
--   * money = bigint minor units + currency char(3) on the same row.
--   * timestamptz everywhere; dates only where the memo says date.
--   * soft delete (deleted_at) on customers, units, sites, subscriptions.
--   * source / source_ref on rows that can originate elsewhere ('zoho' +
--     zcrm id or backend uuid; 'paystack' + ref; ...). Unique per tenant so
--     imports and delta syncs are idempotent upserts.
--   * every state change is also written to activity_log (the bus every
--     "Activity"/"Timeline" tab reads).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Landlords & sites (memo §8 Facility)
-- ----------------------------------------------------------------------------
create table landlords (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id),
  name          text not null,
  kind          text not null default 'company' check (kind in ('company','individual')),
  registration_number text,
  vat_number    text,
  contact_name  text,
  contact_email citext,
  contact_phone text,
  accounts_email citext,
  caretaker_name text,
  caretaker_phone text,
  address       jsonb not null default '{}'::jsonb,
  banking       jsonb,                                  -- encrypted at rest at the app layer
  portal_email  citext,
  portal_active boolean not null default false,
  source        text, source_ref text,
  created_at    timestamptz not null default now(),
  deleted_at    timestamptz
);

create type site_status as enum ('planning','soft-launch','live','paused','decommissioned');

create table sites (
  id                   uuid primary key default gen_random_uuid(),
  tenant_id            uuid not null references tenants(id),
  slug                 text not null,                      -- 'rosebank'
  short_code           text not null,                      -- 'RBK' — unit-id prefix
  name                 text not null,
  city                 text,
  region               text,
  address              text,
  postal_code          text,
  country              char(2),
  lat                  numeric(9,6),
  lng                  numeric(9,6),
  hours                jsonb not null default '{}'::jsonb, -- {"mon":"06:00-22:00",...} or {"24h":true}
  currency             char(3) not null,
  accounting_code      text,                               -- Xero / PowerOffice tracking code
  landlord_id          uuid references landlords(id),
  gross_m2             numeric(10,2),
  lettable_m2          numeric(10,2),
  efficiency_pct       numeric(5,2),
  floors               smallint,
  ceiling_m            numeric(5,2),
  loading_kg_m2        numeric(8,2),
  vip_allocation_mode  text not null default 'silent-upgrade' check (vip_allocation_mode in ('silent-upgrade','explicit-only','always-vip')),
  pricing_defaults     jsonb not null default '{}'::jsonb, -- {b2b_pct, student_pct, move_in_promo}
  security_config      jsonb not null default '{}'::jsonb,
  network_config       jsonb not null default '{}'::jsonb, -- {udm_model, wan, lan_subnet, gateways_target, hubs_target}
  power_config         jsonb not null default '{}'::jsonb, -- {phases, dbs[], ups, genset, solar, ls_strategy}
  physical_spec        jsonb not null default '{}'::jsonb, -- lift, access height, trolleys ... (free text)
  status               site_status not null default 'live',
  launched_at          date,
  source               text, source_ref text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz,
  deleted_at           timestamptz,
  unique (tenant_id, slug),
  unique (tenant_id, short_code)
);
create unique index sites_source_uq on sites(tenant_id, source, source_ref) where source_ref is not null;

create table site_agreements (                                -- landlord contract per site (rev share / fixed rent)
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null references tenants(id),
  site_id          uuid not null references sites(id),
  landlord_id      uuid references landlords(id),
  agreement_type   text not null check (agreement_type in ('revenue_share','fixed_rent','franchise','other')),
  rev_share_pct    numeric(6,3),
  rent_minor       bigint,
  currency         char(3),
  escalation_pct   numeric(6,3),
  escalation_month smallint,
  lease_start      date,
  lease_end        date,
  lease_term_months smallint,
  notice_months    smallint,
  includes         jsonb not null default '{}'::jsonb,      -- {electricity, cleaning}
  document_id      uuid,
  status           text not null default 'active' check (status in ('active','terminated','superseded')),
  source           text, source_ref text,
  created_at       timestamptz not null default now()
);

create table zones (
  id        uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  site_id   uuid not null references sites(id),
  code      text not null,                                   -- 'A', 'B', 'V'
  name      text,                                            -- 'Zone A · Small lockers'
  kind      text,                                            -- small | medium | large | vip | container | drive-up
  layout    jsonb not null default '{}'::jsonb,              -- floor-plan geometry the renderer uses
  unique (site_id, code)
);

create table unit_types (                                     -- memo wizard step 2: unit catalog per site
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references tenants(id),
  site_id           uuid not null references sites(id),
  name              text not null,                          -- '5 m²', '5 kubikk', 'Container 20ft'
  size_value        numeric(8,2),
  size_unit         text check (size_unit in ('m2','m3')),
  features          text[] not null default '{}',
  price_per_size_minor bigint,                              -- R/m² or NOK/m³
  base_price_minor  bigint,                                 -- three-price model input (Phase 2)
  listed_price_minor bigint,                                -- three-price model output (Phase 2)
  currency          char(3),
  is_active         boolean not null default true,
  source            text, source_ref text,
  unique (site_id, name)
);

create type unit_tier   as enum ('normal','climate','vip');
create type unit_status as enum ('available','occupied','reserved','maintenance','decommissioned');

create table units (
  id                     uuid primary key default gen_random_uuid(),
  tenant_id              uuid not null references tenants(id),
  site_id                uuid not null references sites(id),
  zone_id                uuid references zones(id),
  unit_type_id           uuid references unit_types(id),
  number                 text not null,                     -- '08'
  display_name           text,                              -- 'RBK-D-08'
  size_value             numeric(8,2),
  size_unit              text check (size_unit in ('m2','m3')),
  tier                   unit_tier not null default 'normal',
  normal_price_minor     bigint,
  vip_price_minor        bigint,
  listed_price_minor     bigint,
  currency               char(3),
  lock_model             text,                              -- KR-100 | KR-200 | KR-300 climate | Manual | Flexilock | Padlock
  sensor_kind            text,                              -- door | door+motion | door+motion+temp | none
  light_kind             text,                              -- aisle-shared | per-unit-motion | always-on | none
  hub_id                 uuid,                              -- devices(id), fk added below
  hub_port               smallint,
  gateway_id             uuid,
  gateway_poe_port       smallint,
  lock_device_id         uuid,
  meters_from_entrance   integer,
  status                 unit_status not null default 'available',
  status_detail          text,
  current_subscription_id uuid,
  level                  integer,                           -- legacy pricing tier, informational
  dimensions             jsonb not null default '{}'::jsonb, -- {w,h,d,area_m2,volume_m3,floor,mezzanine,column}
  notes                  text,
  commissioned_at        date,
  decommissioned_at      date,
  source                 text, source_ref text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz,
  deleted_at             timestamptz,
  unique (site_id, number)
);
create index on units(tenant_id, site_id, status);
create unique index units_source_uq on units(tenant_id, source, source_ref) where source_ref is not null;

-- ----------------------------------------------------------------------------
-- Customers (memo §3), corporate accounts (memo §4)
-- ----------------------------------------------------------------------------
create type customer_kind   as enum ('individual','business');
create type customer_status as enum ('active','suspended','closed');
create type kyc_status      as enum ('unknown','pending','verified','declined');

create table corporate_accounts (
  id                 uuid primary key default gen_random_uuid(),
  tenant_id          uuid not null references tenants(id),
  name               text not null,
  industry           text,
  vat_number         text,
  registration_number text,
  brand_color        text,
  short_logo         text,
  billing_email      citext,
  billing_phone      text,
  billing_mode       text not null default 'consolidated' check (billing_mode in ('consolidated','per_unit')),
  payment_terms_days smallint,
  billing_day_of_month smallint,
  requires_po        boolean not null default false,
  cost_codes_enabled boolean not null default false,
  discount_pct       numeric(5,2),
  accounting_ref     text,                                 -- xero_contact_id / poweroffice id
  admin_user_id      uuid,                                 -- corporate_users(id), fk added below
  status             text not null default 'active' check (status in ('active','suspended','closed')),
  source             text, source_ref text,
  created_at         timestamptz not null default now(),
  deleted_at         timestamptz
);

create table customers (
  id                   uuid primary key default gen_random_uuid(),
  tenant_id            uuid not null references tenants(id),
  account_number       text,                               -- 'C-24551' per tenant
  kind                 customer_kind not null default 'individual',
  first_name           text,
  last_name            text,
  full_name            text,
  company_name         text,
  email                citext,
  phone                text,                               -- E.164
  address              jsonb not null default '{}'::jsonb, -- {street, city, postal_code, country}
  country              char(2),
  preferred_language   text,                               -- 'en', 'nb', 'fi'
  kyc_status           kyc_status not null default 'unknown',
  kyc_provider         text,                               -- sumsub | verifyid | vipps | bankid | manual
  kyc_provider_ref     text,
  kyc_verified_at      timestamptz,
  accounting_ref       text,                               -- xero_contact_id / poweroffice url
  payment_provider_ref text,                               -- paystack customer code / stripe customer id
  corporate_account_id uuid references corporate_accounts(id),
  flags                jsonb not null default '{}'::jsonb, -- {arrears, suspended, vip_priority}
  marketing_opt_out    boolean not null default false,
  app_user             boolean not null default false,     -- has an app/portal login
  status               customer_status not null default 'active',
  notes_summary        text,                               -- AI summary cache (memo Overview tab)
  customer_since       date,
  source               text, source_ref text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz,
  deleted_at           timestamptz
);
create unique index customers_account_uq on customers(tenant_id, account_number) where account_number is not null;
create unique index customers_email_uq on customers(tenant_id, email) where email is not null and deleted_at is null;
create index on customers(tenant_id, phone);
create index on customers(tenant_id, last_name, first_name);
create unique index customers_source_uq on customers(tenant_id, source, source_ref) where source_ref is not null;

create table corporate_users (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references tenants(id),
  account_id   uuid not null references corporate_accounts(id),
  customer_id  uuid references customers(id),               -- when the user is also a customer row
  name         text not null,
  email        citext,
  phone        text,
  role         text not null default 'member' check (role in ('admin','manager','member')),
  all_units    boolean not null default false,
  status       text not null default 'pending' check (status in ('active','pending','revoked')),
  invited_via  text,                                        -- manual | whatsapp | email | portal | whatsapp+email
  invited_at   timestamptz,
  accepted_at  timestamptz,
  last_access_at timestamptz,
  created_at   timestamptz not null default now()
);
alter table corporate_accounts add constraint corporate_accounts_admin_fk foreign key (admin_user_id) references corporate_users(id) deferrable initially deferred;

create table tags (
  id        uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  name      text not null,
  color     text,
  unique (tenant_id, name)
);
create table customer_tags (
  customer_id uuid not null references customers(id),
  tag_id      uuid not null references tags(id),
  assigned_by uuid references users(id),
  assigned_at timestamptz not null default now(),
  primary key (customer_id, tag_id)
);

create table payment_instruments (                          -- a customer's stored card / mandate
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id),
  customer_id   uuid not null references customers(id),
  provider      text not null,                              -- paystack | stripe | vipps | manual
  provider_ref  text,                                       -- authorization code / pm_ id
  kind          text,                                       -- card | eft | invoice
  brand         text,
  last4         text,
  expiry        text,                                       -- 'MM/YY'
  status        text not null default 'active' check (status in ('active','expired','revoked')),
  is_default    boolean not null default false,
  source        text, source_ref text,
  created_at    timestamptz not null default now()
);
create index on payment_instruments(customer_id);

-- ----------------------------------------------------------------------------
-- Subscriptions & reservations (memo §3 Subscription, §5 reservation link)
-- ----------------------------------------------------------------------------
create type subscription_status as enum ('pending','active','arrears','notice_given','paused','suspended','closed');

create table subscriptions (
  id                    uuid primary key default gen_random_uuid(),
  tenant_id             uuid not null references tenants(id),
  customer_id           uuid not null references customers(id),
  unit_id               uuid not null references units(id),
  site_id               uuid not null references sites(id),
  corporate_account_id  uuid references corporate_accounts(id),
  internal_label        text,                              -- corporate: 'Archive — Marketing 2024'
  cost_code             text,                              -- corporate: 'DG-OPS-01'
  plan_size_value       numeric(8,2),
  plan_size_unit        text check (plan_size_unit in ('m2','m3')),
  price_minor           bigint not null,                   -- what the customer pays per period (after discount)
  list_price_minor      bigint,                            -- price before discount at sign-up
  discount_pct          numeric(5,2),
  discount_code         text,
  discount_ends_at      date,
  currency              char(3) not null,
  billing_period        text not null default 'monthly' check (billing_period in ('monthly','yearly','weekly','daily')),
  billing_day           smallint,                          -- derived from started_at, never changes
  started_at            date not null,
  ends_at               date,
  next_bill_at          date,
  status                subscription_status not null default 'active',
  notice_at             date,
  notice_reason         text,
  closed_at             date,
  closed_reason         text,
  outstanding_minor     bigint not null default 0,
  payment_instrument_id uuid references payment_instruments(id),
  booking_channel       text,                              -- web | app | whatsapp | operator | chatbot
  first_access_at       timestamptz,
  legacy                jsonb not null default '{}'::jsonb, -- anything from the source system with no core home (kept, not modelled)
  source                text, source_ref text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz,
  deleted_at            timestamptz
);
create index on subscriptions(tenant_id, status);
create index on subscriptions(customer_id);
create index on subscriptions(unit_id);
create index on subscriptions(site_id, status);
create unique index subscriptions_source_uq on subscriptions(tenant_id, source, source_ref) where source_ref is not null;
alter table units add constraint units_current_subscription_fk foreign key (current_subscription_id) references subscriptions(id) deferrable initially deferred;

create table corporate_unit_users (                         -- which corporate users may open which units
  subscription_id   uuid not null references subscriptions(id),
  corporate_user_id uuid not null references corporate_users(id),
  primary key (subscription_id, corporate_user_id)
);

create table reservations (                                  -- a hold that is not (yet) a subscription
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id),
  customer_id   uuid references customers(id),
  lead_id       uuid,                                        -- leads(id), fk added below
  unit_id       uuid not null references units(id),
  site_id       uuid not null references sites(id),
  status        text not null default 'pending' check (status in ('pending','payment_in_progress','converted','expired','abandoned','cancelled')),
  hold_until    timestamptz,
  price_minor   bigint,
  currency      char(3),
  payment_link  text,
  converted_subscription_id uuid references subscriptions(id),
  booking_channel text,
  source        text, source_ref text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz
);
create index on reservations(tenant_id, status);
create unique index reservations_source_uq on reservations(tenant_id, source, source_ref) where source_ref is not null;

-- ----------------------------------------------------------------------------
-- Invoices & payments (memo §9)
-- ----------------------------------------------------------------------------
create type invoice_status as enum ('draft','pending','paid','partially_paid','overdue','retry','written_off','cancelled');

create table invoices (
  id                  uuid primary key default gen_random_uuid(),
  tenant_id           uuid not null references tenants(id),
  number              text not null,                       -- 'INV-202605-0142'
  customer_id         uuid references customers(id),
  corporate_account_id uuid references corporate_accounts(id),
  period_start        date,
  period_end          date,
  subtotal_minor      bigint not null default 0,
  discount_minor      bigint not null default 0,
  vat_minor           bigint not null default 0,
  total_minor         bigint not null default 0,
  currency            char(3) not null,
  vat_rate            numeric(5,4),
  status              invoice_status not null default 'pending',
  due_at              date,
  issued_at           timestamptz,
  paid_at             timestamptz,
  retry_attempt       smallint not null default 0,
  last_payment_id     uuid,
  accounting_ref      text,                                 -- xero invoice id
  pdf_document_id     uuid,
  source              text, source_ref text,
  created_at          timestamptz not null default now(),
  unique (tenant_id, number)
);
create index on invoices(customer_id, status);

create table invoice_lines (
  id              uuid primary key default gen_random_uuid(),
  invoice_id      uuid not null references invoices(id),
  subscription_id uuid references subscriptions(id),
  unit_id         uuid references units(id),
  description     text not null,
  cost_code       text,
  product_kind    text not null default 'storage',           -- storage | late_fee | insurance | software_fee | auction | other
  quantity        numeric(10,2) not null default 1,
  unit_price_minor bigint not null,
  discount_minor  bigint not null default 0,
  vat_rate        numeric(5,4),
  vat_minor       bigint not null default 0,
  total_minor     bigint not null,
  revenue_share_eligible boolean not null default true
);

create type payment_status as enum ('settled','pending','failed','reversed','refunded','authorised');

create table payments (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null references tenants(id),
  invoice_id       uuid references invoices(id),
  subscription_id  uuid references subscriptions(id),
  customer_id      uuid references customers(id),
  method           text not null,                            -- paystack-card | paystack-eft | manual-eft | stripe-card | vipps | invoice | cash | credit_note | other
  provider         text,                                     -- paystack | stripe | xero | poweroffice | manual
  provider_ref     text,                                     -- pi_… / paystack reference / invoice number
  provider_message text,
  amount_minor     bigint not null,
  refunded_minor   bigint not null default 0,
  currency         char(3) not null,
  status           payment_status not null,
  card_last4       text,
  attempt_number   smallint,
  received_at      timestamptz,
  settled_at       timestamptz,
  is_test          boolean not null default false,
  raw              jsonb,                                    -- provider webhook payload (forensics)
  source           text, source_ref text,
  created_at       timestamptz not null default now()
);
create index on payments(tenant_id, received_at desc);
create index on payments(customer_id, received_at desc);
create index on payments(subscription_id);
create unique index payments_source_uq on payments(tenant_id, source, source_ref) where source_ref is not null;
alter table invoices add constraint invoices_last_payment_fk foreign key (last_payment_id) references payments(id);

create table pricing_rules (                                 -- memo §9 Pricing tab
  id                    uuid primary key default gen_random_uuid(),
  tenant_id             uuid not null references tenants(id),
  site_id               uuid not null references sites(id),
  unit_type_id          uuid references unit_types(id),
  listed_price_per_size_minor bigint,
  currency              char(3),
  band                  text check (band in ('high-demand','normal','under-utilised')),
  occupancy_from_pct    numeric(5,2),
  occupancy_to_pct      numeric(5,2),
  multiplier            numeric(6,3),
  override_pct          numeric(6,2),
  override_active_until date,
  override_reason       text,
  is_active             boolean not null default true,
  created_by            uuid references users(id),
  created_at            timestamptz not null default now()
);

create table price_history (                                 -- every listed/base price change, incl. legacy pricing-engine notices
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id),
  site_id       uuid references sites(id),
  unit_type_id  uuid references unit_types(id),
  unit_id       uuid references units(id),
  kind          text not null,                              -- base | listed | contracted | dynamic
  old_price_minor bigint,
  new_price_minor bigint,
  currency      char(3),
  occupancy_from_pct numeric(6,2),
  occupancy_to_pct   numeric(6,2),
  multiplier    numeric(6,3),
  reason        text,
  changed_by    uuid references users(id),
  changed_at    timestamptz not null,
  source        text, source_ref text
);
create index on price_history(site_id, changed_at desc);

-- ----------------------------------------------------------------------------
-- Leads (memo §5)
-- ----------------------------------------------------------------------------
create type lead_stage  as enum ('new','contacted','qualified','visiting','reserved','converted','lost');

create table leads (
  id                   uuid primary key default gen_random_uuid(),
  tenant_id            uuid not null references tenants(id),
  lead_number          text,                                -- 'L-2031'
  name                 text not null,
  email                citext,
  phone                text,
  company              text,
  source               text,                                -- whatsapp | website | walk-in | referral | google-ads | chat | webform | abandoned-checkout
  site_id              uuid references sites(id),
  size_pref_value      numeric(8,2),
  size_pref_unit       text,
  move_in_pref         date,
  move_out_pref        date,
  value_estimate_minor bigint,
  currency             char(3),
  stage                lead_stage not null default 'new',
  score                smallint,                             -- 0..100
  is_recurring         boolean not null default false,       -- ★ marker
  last_touch_at        timestamptz,
  last_touch_text      text,
  conversation_id      uuid,                                 -- conversations(id), fk added below
  matched_customer_id  uuid references customers(id),
  converted_customer_id uuid references customers(id),
  converted_at         timestamptz,
  loss_reason_code     text,                                 -- competitor | price | location | size | no_longer_needs | ghosted | abandoned_checkout
  loss_reason_text     text,
  lost_at              timestamptz,
  attribution          jsonb not null default '{}'::jsonb,  -- utm, gclid, campaign, keyword, referrer, click cost
  web_activity         jsonb not null default '{}'::jsonb,
  owner_user_id        uuid references users(id),
  origin               text, source_ref text,                -- origin = provenance system ('zoho'); `source` above is the lead channel
  created_at           timestamptz not null default now(),
  updated_at           timestamptz,
  deleted_at           timestamptz
);
create index on leads(tenant_id, stage);
create index on leads(tenant_id, email) where email is not null;
create unique index leads_source_uq on leads(tenant_id, origin, source_ref) where source_ref is not null;
alter table reservations add constraint reservations_lead_fk foreign key (lead_id) references leads(id);

create table campaigns (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id),
  name          text not null,
  kind          text,                                       -- google-ads | newsletter | other
  status        text,
  start_date    date,
  end_date      date,
  budget_minor  bigint,
  actual_cost_minor bigint,
  currency      char(3),
  attributes    jsonb not null default '{}'::jsonb,
  source        text, source_ref text,
  created_at    timestamptz
);
create table lead_campaigns (
  lead_id     uuid not null references leads(id),
  campaign_id uuid not null references campaigns(id),
  status      text,
  created_at  timestamptz,
  primary key (lead_id, campaign_id)
);

-- ----------------------------------------------------------------------------
-- Conversations & messages (memo §2 Inbox) — one conversation per customer/lead
-- ----------------------------------------------------------------------------
create type channel_kind  as enum ('whatsapp','email','chat','sms','phone');
create type author_kind   as enum ('customer','agent_ai','operator','system');

create table conversations (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null references tenants(id),
  customer_id      uuid references customers(id),
  lead_id          uuid references leads(id),
  subject          text,
  channels         channel_kind[] not null default '{}',
  status           text not null default 'closed' check (status in ('urgent','awaiting-operator','bot-handling','bot-resolved','closed')),
  unread_count     integer not null default 0,
  bot_handled_count integer not null default 0,
  last_message_at  timestamptz,
  assigned_user_id uuid references users(id),
  source           text, source_ref text,
  created_at       timestamptz not null default now(),
  check (customer_id is not null or lead_id is not null)
);
create unique index conversations_customer_uq on conversations(customer_id) where customer_id is not null;
create unique index conversations_lead_uq on conversations(lead_id) where lead_id is not null and customer_id is null;
alter table leads add constraint leads_conversation_fk foreign key (conversation_id) references conversations(id);

create table messages (
  id                 uuid not null default gen_random_uuid(),
  tenant_id          uuid not null references tenants(id),
  conversation_id    uuid not null references conversations(id),
  channel            channel_kind not null,
  direction          text not null check (direction in ('inbound','outbound','internal')),
  author_kind        author_kind not null,
  author_id          uuid,
  sent_at            timestamptz not null,
  subject            text,
  body               text,
  attachments        jsonb not null default '[]'::jsonb,    -- [{name,url,mime,size}]
  reply_to_message_id uuid,
  channel_message_id text,                                  -- provider id for idempotency
  provider_status    text,                                  -- queued | sent | delivered | read | failed | bounced | opened | clicked
  template_id        text,
  meta               jsonb not null default '{}'::jsonb,    -- opens, clicks, call duration, recording url, escalation reason ...
  source             text, source_ref text,
  primary key (id, sent_at)
) partition by range (sent_at);
create index on messages(conversation_id, sent_at desc);
create index on messages(tenant_id, sent_at desc);
create unique index messages_source_uq on messages(tenant_id, source, source_ref, sent_at) where source_ref is not null;

create table ai_drafts (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenants(id),
  conversation_id uuid not null references conversations(id),
  body            text not null,
  confidence      numeric(4,3),
  matched_case_ids uuid[] not null default '{}',
  status          text not null default 'proposed' check (status in ('proposed','used','edited','discarded','expired')),
  created_at      timestamptz not null default now(),
  resolved_at     timestamptz
);

-- ----------------------------------------------------------------------------
-- AI agent (memo §6)
-- ----------------------------------------------------------------------------
create table agent_capabilities (
  id          text primary key,                              -- reply_routine_chat ...
  label       text not null,
  description text,
  side_effect_endpoint text
);
create table agent_settings (
  tenant_id     uuid not null references tenants(id),
  capability_id text not null references agent_capabilities(id),
  mode          text not null default 'approve' check (mode in ('autonomous','approve','off')),
  threshold     numeric(4,3) not null default 0.900,
  updated_by    uuid references users(id),
  updated_at    timestamptz not null default now(),
  primary key (tenant_id, capability_id)
);
create table agent_proposals (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null references tenants(id),
  capability_id    text not null references agent_capabilities(id),
  status           text not null default 'pending' check (status in ('pending','approved','rejected','adjusted','expired')),
  title            text not null,
  rationale_md     text,
  confidence       numeric(4,3),
  affects          jsonb not null default '[]'::jsonb,      -- [{kind, id, label}]
  expected_impact  text,
  payload          jsonb not null default '{}'::jsonb,
  severity         text check (severity in ('bad','watch')),
  created_at       timestamptz not null default now(),
  expires_at       timestamptz,
  resolved_at      timestamptz,
  resolved_by      uuid references users(id),
  resolution       jsonb
);
create index on agent_proposals(tenant_id, status, created_at desc);

-- ----------------------------------------------------------------------------
-- Devices (memo §7): UDM → gateway → hub → lock/sensor/light, one tree table
-- ----------------------------------------------------------------------------
create type device_kind   as enum ('udm','switch','gateway','hub','lock','sensor','light','camera','electrical','env');
create type device_status as enum ('good','watch','bad','unknown');

create table devices (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id),
  site_id       uuid references sites(id),                  -- null = spare stock, not installed anywhere
  zone_id       uuid references zones(id),
  parent_id     uuid references devices(id),
  kind          device_kind not null,
  name          text not null,
  model         text,
  serial        text,
  ip            inet,
  mac           text,
  firmware      text,
  port          smallint,                                   -- PoE port / RS-485 address / lock port
  unit_id       uuid references units(id),                  -- locks
  status        device_status not null default 'unknown',
  last_ping_at  timestamptz,
  latency_ms    integer,
  uptime_pct    numeric(5,2),
  last_event_text text,
  attrs         jsonb not null default '{}'::jsonb,         -- cpu, mem, poe budget, wan, wattage, sensor value, light state ...
  source        text, source_ref text,
  created_at    timestamptz not null default now(),
  deleted_at    timestamptz
);
create index on devices(site_id, kind);
create index on devices(parent_id);
create unique index devices_source_uq on devices(tenant_id, source, source_ref) where source_ref is not null;
alter table units add constraint units_hub_fk foreign key (hub_id) references devices(id);
alter table units add constraint units_gateway_fk foreign key (gateway_id) references devices(id);
alter table units add constraint units_lock_fk foreign key (lock_device_id) references devices(id);

create table incidents (                                     -- memo §1 cockpit "Mode banner"
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id),
  site_id     uuid references sites(id),
  severity    text not null check (severity in ('watch','bad')),
  headline    text not null,
  detail      text,
  status      text not null default 'open' check (status in ('open','mitigated','resolved')),
  opened_at   timestamptz not null default now(),
  resolved_at timestamptz
);

create table tech_tickets (                                  -- memo §8
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id),
  site_id     uuid not null references sites(id),
  unit_id     uuid references units(id),
  device_id   uuid references devices(id),
  customer_id uuid references customers(id),
  subject     text not null,
  priority    text not null default 'medium' check (priority in ('low','medium','high','critical')),
  channel     text,                                          -- whatsapp | email | phone | internal | auto
  customer_text text,
  notes       text,
  status      text not null default 'open' check (status in ('open','investigating','resolved')),
  assigned_user_id uuid references users(id),
  created_by  uuid references users(id),
  created_at  timestamptz not null default now(),
  resolved_at timestamptz,
  resolution_note text
);
create index on tech_tickets(tenant_id, status);

-- ----------------------------------------------------------------------------
-- Arrears & auctions (memo §10)
-- ----------------------------------------------------------------------------
create table arrears_cases (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null references tenants(id),
  customer_id      uuid not null references customers(id),
  subscription_id  uuid references subscriptions(id),
  amount_minor     bigint not null,
  currency         char(3) not null,
  days_overdue     integer not null default 0,
  attempts         integer not null default 0,
  stage            text not null default 'gentle' check (stage in ('gentle','firm','arranged','pre-auction')),
  status           text not null default 'active' check (status in ('active','arranged','resolved','auctioned')),
  access_revoked_at   timestamptz,
  legal_notice_sent_at timestamptz,
  opened_at        timestamptz not null default now(),
  resolved_at      timestamptz,
  source           text, source_ref text
);
create index on arrears_cases(tenant_id, status);
create table arrears_actions (
  id         uuid primary key default gen_random_uuid(),
  case_id    uuid not null references arrears_cases(id),
  ts         timestamptz not null default now(),
  action     text not null,                                  -- reminder_gentle | reminder_firm | card_retry | access_revoked | legal_notice | arrangement | payment
  channel    text,
  actor_kind author_kind,
  document_id uuid,
  detail     jsonb not null default '{}'::jsonb
);

create table auctions (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references tenants(id),
  case_id        uuid references arrears_cases(id),
  customer_id    uuid not null references customers(id),
  unit_id        uuid not null references units(id),
  stage          text not null default 'at-risk' check (stage in ('at-risk','notice','inventory','listed','closing','closed')),
  amount_minor   bigint,
  reserve_minor  bigint,
  starting_bid_minor bigint,
  currency       char(3),
  photos         jsonb not null default '[]'::jsonb,
  description    text,
  platform       text,                                       -- ibid | internal
  platform_listing_id text,
  listed_at      timestamptz,
  ends_at        timestamptz,
  closed_at      timestamptz,
  sold           boolean,
  sold_for_minor bigint,
  winner         jsonb,
  handover       jsonb,
  created_at     timestamptz not null default now()
);
create table auction_bids (
  id          uuid primary key default gen_random_uuid(),
  auction_id  uuid not null references auctions(id),
  bidder_ref  text,
  amount_minor bigint not null,
  region      text,
  placed_at   timestamptz not null
);

-- ----------------------------------------------------------------------------
-- Notes, documents, saved reports (memo cross-cutting)
-- ----------------------------------------------------------------------------
create table notes (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id),
  target_kind   text not null,                              -- customer | unit | device | site | subscription | lead | ticket
  target_id     uuid not null,
  body_md       text not null,
  author_kind   author_kind not null default 'operator',
  author_id     uuid,
  pinned        boolean not null default false,
  ai_consumed   boolean not null default false,
  source        text, source_ref text,
  created_at    timestamptz not null default now(),
  deleted_at    timestamptz
);
create index on notes(target_kind, target_id, created_at desc);
create unique index notes_source_uq on notes(tenant_id, source, source_ref) where source_ref is not null;

create table documents (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references tenants(id),
  target_kind  text not null,
  target_id    uuid not null,
  kind         text not null,                                -- lease | id | proof_of_address | photo | drawing | feasibility | invoice_pdf | other
  name         text not null,
  storage_key  text,                                         -- object-storage key once hosted
  local_path   text,                                         -- backup-relative path until hosted
  url          text,
  mime         text,
  size_bytes   bigint,
  uploaded_by  uuid references users(id),
  uploaded_at  timestamptz not null default now(),
  source       text, source_ref text
);
create index on documents(target_kind, target_id);
create unique index documents_source_uq on documents(tenant_id, source, source_ref) where source_ref is not null;

create table saved_reports (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references tenants(id),
  name         text not null,
  schedule     text,                                          -- cron
  recipients   citext[] not null default '{}',
  query        jsonb not null default '{}'::jsonb,
  last_sent_at timestamptz,
  created_by   uuid references users(id),
  created_at   timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Activity log — the single append-only bus (memo cross-cutting). Partitioned
-- by month; the legacy event firehose lands here too.
-- ----------------------------------------------------------------------------
create table activity_log (
  id               uuid not null default gen_random_uuid(),
  tenant_id        uuid not null,
  ts               timestamptz not null,
  actor_kind       author_kind not null,
  actor_id         uuid,
  action           text not null,                             -- customer.created, lock.unlock, payment.failed, agent.approved ...
  target_kind      text,
  target_id        uuid,
  customer_id      uuid,
  subscription_id  uuid,
  unit_id          uuid,
  site_id          uuid,
  device_id        uuid,
  severity         text check (severity in ('watch','bad')),
  summary          text,                                      -- one-line human text
  payload          jsonb not null default '{}'::jsonb,
  source           text, source_ref text,
  primary key (id, ts)
) partition by range (ts);
create index on activity_log(tenant_id, ts desc);
create index on activity_log(customer_id, ts desc) where customer_id is not null;
create index on activity_log(subscription_id, ts desc) where subscription_id is not null;
create index on activity_log(unit_id, ts desc) where unit_id is not null;
create index on activity_log(site_id, action, ts desc);
create unique index activity_log_source_uq on activity_log(tenant_id, source, source_ref, ts) where source_ref is not null;

do $$
declare d date := date '2020-01-01';
begin
  while d < date '2028-01-01' loop
    execute format('create table if not exists activity_log_%s partition of activity_log for values from (%L) to (%L)', to_char(d,'YYYY_MM'), d, d + interval '1 month');
    execute format('create table if not exists messages_%s partition of messages for values from (%L) to (%L)', to_char(d,'YYYY_MM'), d, d + interval '1 month');
    d := d + interval '1 month';
  end loop;
end $$;
create table activity_log_default partition of activity_log default;
create table messages_default partition of messages default;

-- ----------------------------------------------------------------------------
-- Derived views the console reads directly in Phase 1
-- ----------------------------------------------------------------------------
create view v_site_occupancy with (security_invoker = true) as
select s.tenant_id, s.id as site_id, s.name, s.short_code,
       count(u.*) filter (where u.status <> 'decommissioned' and u.deleted_at is null) as units_total,
       count(u.*) filter (where u.status = 'occupied')     as units_occupied,
       count(u.*) filter (where u.status = 'available')    as units_available,
       count(u.*) filter (where u.status = 'reserved')     as units_reserved,
       count(u.*) filter (where u.status = 'maintenance')  as units_maintenance,
       round(100.0 * count(u.*) filter (where u.status = 'occupied')
             / nullif(count(u.*) filter (where u.status <> 'decommissioned' and u.deleted_at is null), 0), 1) as occupancy_pct,
       coalesce(sum(sub.price_minor) filter (where sub.status in ('active','arrears','notice_given') and sub.billing_period = 'monthly'), 0) as mrr_minor
from sites s
left join units u on u.site_id = s.id
left join subscriptions sub on sub.id = u.current_subscription_id
where s.deleted_at is null
group by s.tenant_id, s.id, s.name, s.short_code;

create view v_schedule with (security_invoker = true) as                                       -- memo §1 "Today's schedule": move-ins, move-outs, tours
select tenant_id, 'move-in'::text as kind, started_at as on_date, customer_id, site_id, unit_id, id as subscription_id
from subscriptions where started_at is not null
union all
select tenant_id, 'move-out', ends_at, customer_id, site_id, unit_id, id
from subscriptions where ends_at is not null
union all
select tenant_id, 'tour', move_in_pref, matched_customer_id, site_id, null, null
from leads where stage = 'visiting' and move_in_pref is not null;


-- ============================================================================
-- Multi-tenant safety & efficiency
-- ============================================================================

-- 1. Tenant-scoped foreign keys. Every child→parent reference inside a tenant
--    is enforced as (tenant_id, id) → (tenant_id, id), so a bug in the app
--    layer can never attach a row to another tenant's parent, whatever RLS
--    context it runs in. Parents get unique(tenant_id, id); children lose the
--    single-column FK and gain the composite one.
do $$
declare
  rel record;
  parents text[] := array['sites','zones','unit_types','units','customers','corporate_accounts','corporate_users','subscriptions','reservations',
                          'invoices','payments','payment_instruments','leads','campaigns','conversations','devices','landlords','tech_tickets',
                          'arrears_cases','auctions','agent_proposals','incidents','tags','notes','documents'];
  p text;
begin
  foreach p in array parents loop
    if not exists (select 1 from pg_constraint where conrelid = ('public.'||p)::regclass and contype = 'u' and conname = p||'_tenant_id_id_key') then
      execute format('alter table %I add constraint %I unique (tenant_id, id)', p, p||'_tenant_id_id_key');
    end if;
  end loop;

  for rel in
    select c.conrelid::regclass::text as child, a.attname as col, c.confrelid::regclass::text as parent, c.conname
    from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
    join pg_namespace n on n.oid = c.connamespace
    join pg_class ch on ch.oid = c.conrelid and not ch.relispartition
    where n.nspname = 'public' and c.contype = 'f' and array_length(c.conkey, 1) = 1
      and c.confrelid::regclass::text = any (parents)
      and exists (select 1 from pg_attribute t where t.attrelid = c.conrelid and t.attname = 'tenant_id')
      and c.conrelid::regclass::text not in ('tenants')
  loop
    execute format('alter table %s drop constraint %I', rel.child, rel.conname);
    execute format('alter table %s add constraint %I foreign key (tenant_id, %I) references %s (tenant_id, id) %s',
                   rel.child, rel.conname, rel.col, rel.parent,
                   case when rel.conname in ('units_current_subscription_fk','corporate_accounts_admin_fk') then 'deferrable initially deferred' else '' end);
  end loop;
end $$;

-- Partitioned tables cannot carry FKs to their parents' (tenant_id,id) cheaply; a trigger does the same job.
create or replace function enforce_tenant_refs() returns trigger language plpgsql as $$
declare j jsonb := to_jsonb(new); cid uuid; conv uuid;
begin
  if tg_table_name = 'activity_log' then
    cid := (j->>'customer_id')::uuid;
    if cid is not null and not exists (select 1 from customers where id = cid and tenant_id = new.tenant_id) then
      raise exception 'tenant mismatch: customer % is not in tenant %', cid, new.tenant_id using errcode = '23503';
    end if;
  elsif tg_table_name = 'messages' then
    conv := (j->>'conversation_id')::uuid;
    if not exists (select 1 from conversations where id = conv and tenant_id = new.tenant_id) then
      raise exception 'tenant mismatch: conversation % is not in tenant %', conv, new.tenant_id using errcode = '23503';
    end if;
  end if;
  return new;
end $$;
create trigger activity_log_tenant_refs before insert or update on activity_log for each row execute function enforce_tenant_refs();
create trigger messages_tenant_refs before insert or update on messages for each row execute function enforce_tenant_refs();

-- 2. Per-tenant counters (account numbers C-24551, invoices INV-202605-0142, leads L-2031, tickets T-1024).
--    One row per (tenant, key); the UPDATE takes a row lock so numbers are gap-free per tenant under concurrency.
create table tenant_counters (
  tenant_id uuid not null references tenants(id),
  key       text not null,
  value     bigint not null default 0,
  primary key (tenant_id, key)
);
create or replace function next_number(p_tenant uuid, p_key text) returns bigint language plpgsql as $$
declare v bigint;
begin
  insert into tenant_counters (tenant_id, key, value) values (p_tenant, p_key, 1)
  on conflict (tenant_id, key) do update set value = tenant_counters.value + 1
  returning value into v;
  return v;
end $$;

-- 3. updated_at maintenance on the tables that have it
create or replace function touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
do $$
declare r record;
begin
  for r in select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
           join pg_attribute a on a.attrelid = c.oid and a.attname = 'updated_at' and not a.attisdropped
           where n.nspname = 'public' and c.relkind = 'r' and not c.relispartition
  loop
    execute format('create trigger %I before update on %I for each row execute function touch_updated_at()', r.relname||'_touch', r.relname);
  end loop;
end $$;

-- 4. Console read models (all security_invoker so RLS applies)
create view v_arrears with (security_invoker = true) as
select s.tenant_id, s.customer_id, s.id as subscription_id, s.site_id, s.unit_id, s.outstanding_minor as amount_minor, s.currency,
       coalesce(ac.days_overdue, greatest(0, current_date - coalesce(s.next_bill_at, s.started_at))) as days_overdue,
       coalesce(ac.stage, 'gentle') as stage, coalesce(ac.status, 'active') as case_status, ac.id as case_id
from subscriptions s
left join arrears_cases ac on ac.subscription_id = s.id and ac.status in ('active','arranged')
where s.status = 'arrears' and s.deleted_at is null;

create view v_cockpit_kpis with (security_invoker = true) as
select t.id as tenant_id, t.currency,
       (select coalesce(sum(price_minor),0) from subscriptions s where s.tenant_id = t.id and s.status in ('active','arrears','notice_given') and s.billing_period = 'monthly') as mrr_minor,
       (select coalesce(sum(outstanding_minor),0) from subscriptions s where s.tenant_id = t.id and s.status = 'arrears') as outstanding_minor,
       (select count(*) from subscriptions s where s.tenant_id = t.id and s.status = 'arrears') as outstanding_count,
       (select coalesce(sum(amount_minor),0) from payments p where p.tenant_id = t.id and p.status = 'settled' and p.received_at >= current_date) as collected_today_minor,
       (select count(*) from payments p where p.tenant_id = t.id and p.status = 'settled' and p.received_at >= current_date) as payments_today,
       (select count(*) from payments p where p.tenant_id = t.id and p.status = 'failed' and p.received_at >= current_date) as payments_failed_today,
       (select count(*) from subscriptions s where s.tenant_id = t.id and s.started_at = current_date) as moveins_today,
       (select count(*) from subscriptions s where s.tenant_id = t.id and s.ends_at = current_date) as moveouts_today,
       (select round(avg(occupancy_pct),1) from v_site_occupancy o where o.tenant_id = t.id) as occupancy_avg_pct,
       (select count(*) from devices d where d.tenant_id = t.id and d.kind in ('udm','gateway','hub') and d.site_id is not null and d.deleted_at is null) as devices_total,
       (select count(*) from devices d where d.tenant_id = t.id and d.kind in ('udm','gateway','hub') and d.site_id is not null and d.status = 'good') as devices_online,
       (select count(*) from devices d where d.tenant_id = t.id and d.kind in ('udm','gateway','hub') and d.site_id is not null and d.status = 'watch') as devices_degraded,
       (select count(*) from devices d where d.tenant_id = t.id and d.kind in ('udm','gateway','hub') and d.site_id is not null and d.status = 'bad') as devices_offline,
       (select count(*) from agent_proposals a where a.tenant_id = t.id and a.status = 'pending') as proposals_pending
from tenants t;
