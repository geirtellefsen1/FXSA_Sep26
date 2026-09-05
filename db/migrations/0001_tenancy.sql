-- ============================================================================
-- 0001  Tenancy
-- Flexistore multi-tenant PMS. One database, one schema, tenant_id on every
-- operational row, row-level security (0005). A tenant is an operating
-- company (Flexistore South Africa, Flexistore Norway, a third-party operator
-- later). An org groups tenants for cross-tenant staff and reporting.
-- ============================================================================
create extension if not exists pgcrypto;
create extension if not exists citext;

create table orgs (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  created_at  timestamptz not null default now()
);

create table tenants (
  id                 uuid primary key default gen_random_uuid(),
  org_id             uuid not null references orgs(id),
  slug               text not null unique,            -- 'fxsa', 'fxno', 'fxfi'
  name               text not null,                   -- 'Flexistore South Africa'
  legal_name         text,
  country            char(2) not null,                -- ISO 3166-1 alpha-2
  currency           char(3) not null,                -- ISO 4217, the tenant's ledger currency
  timezone           text not null,                   -- IANA, e.g. Africa/Johannesburg
  locale             text not null default 'en-ZA',
  vat_rate           numeric(5,4) not null,           -- 0.1500
  support_phone      text,
  support_email      citext,
  brand              jsonb not null default '{}'::jsonb,   -- logo, colours, product name shown in the console
  integrations       jsonb not null default '{}'::jsonb,   -- per-adapter config: payments, accounting, kyc, channels, access, auctions
  settings           jsonb not null default '{}'::jsonb,   -- size_unit, id formats, thresholds
  status             text not null default 'active' check (status in ('active','suspended','archived')),
  created_at         timestamptz not null default now()
);

create type staff_role as enum ('super_admin','admin','manager','operator','viewer');

create table users (
  id           uuid primary key default gen_random_uuid(),
  email        citext not null unique,
  first_name   text,
  last_name    text,
  full_name    text generated always as (trim(coalesce(first_name,'') || ' ' || coalesce(last_name,''))) stored,
  status       text not null default 'active' check (status in ('active','disabled','closed')),
  is_org_admin boolean not null default false,        -- sees every tenant of the org
  org_id       uuid references orgs(id),
  timezone     text,
  totp_enabled boolean not null default false,
  last_login_at timestamptz,
  source       text,                                  -- 'zoho' when migrated
  source_ref   text,
  created_at   timestamptz not null default now()
);

create table tenant_memberships (
  tenant_id  uuid not null references tenants(id),
  user_id    uuid not null references users(id),
  role       staff_role not null,
  created_at timestamptz not null default now(),
  primary key (tenant_id, user_id)
);

-- Every staff mutation. before/after are JSONB snapshots.
create table audit_log (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid references tenants(id),
  user_id         uuid references users(id),
  ts              timestamptz not null default now(),
  action          text not null,                     -- 'customer.update', 'unit.reserve' ...
  target_kind     text,
  target_id       uuid,
  before_state    jsonb,
  after_state     jsonb,
  idempotency_key text,
  ip              inet,
  request_id      text
);
create index on audit_log(tenant_id, ts desc);
create index on audit_log(target_kind, target_id);
