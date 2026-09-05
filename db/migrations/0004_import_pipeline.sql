-- ============================================================================
-- 0004  Import pipeline: raw staging schema, run bookkeeping, helper functions
-- ============================================================================
create schema if not exists zoho_raw;      -- one text-typed table per CSV module; created by the loader
create schema if not exists import;

create table import.runs (
  id            uuid primary key default gen_random_uuid(),
  kind          text not null,                    -- zoho_backup | zoho_delta | canonical_csv
  source_label  text,
  started_at    timestamptz not null default now(),
  finished_at   timestamptz,
  status        text not null default 'running' check (status in ('running','staged','legacy_loaded','core_loaded','validated','failed','aborted')),
  options       jsonb not null default '{}'::jsonb,
  summary       jsonb not null default '{}'::jsonb,
  error         text
);

create table import.files (
  id           uuid primary key default gen_random_uuid(),
  run_id       uuid not null references import.runs(id),
  module       text not null,
  file_name    text not null,
  size_bytes   bigint,
  sha256       text,
  header_cols  integer,
  rows_expected bigint,
  rows_loaded  bigint,
  loaded_at    timestamptz
);

create table import.checks (
  id         uuid primary key default gen_random_uuid(),
  run_id     uuid not null references import.runs(id),
  stage      text not null,                       -- staging | legacy | core
  name       text not null,
  expected   text,
  actual     text,
  passed     boolean,
  severity   text not null default 'error' check (severity in ('error','warn','info')),
  detail     jsonb not null default '{}'::jsonb,
  checked_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Helper functions (null-safe)
-- ----------------------------------------------------------------------------
create or replace function import.nz(t text) returns text language sql immutable as $$
  select case when t is null or btrim(t) = '' then null else btrim(t) end $$;

create or replace function import.zoho_bool(t text) returns boolean language sql immutable as $$
  select case lower(btrim(coalesce(t,'')))
           when 'true' then true when 't' then true when '1' then true when 'yes' then true
           when 'false' then false when 'f' then false when '0' then false when 'no' then false
           else null end $$;

-- Zoho export timestamps are in the org time zone (Africa/Johannesburg, UTC+2, no DST).
create or replace function import.zoho_ts(t text, tz text default 'Africa/Johannesburg') returns timestamptz
language plpgsql immutable as $$
declare s text := import.nz(t); r timestamp;
begin
  if s is null then return null; end if;
  s := replace(s, 'T', ' ');
  s := regexp_replace(s, '(\.\d+)?(Z|[+-]\d\d:?\d\d)$', '');
  begin
    if s ~ '^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$' then r := to_timestamp(s, 'YYYY-MM-DD HH24:MI:SS')::timestamp;
    elsif s ~ '^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$' then r := to_timestamp(s, 'YYYY-MM-DD HH24:MI')::timestamp;
    elsif s ~ '^\d{4}-\d{2}-\d{2}$' then r := to_timestamp(s, 'YYYY-MM-DD')::timestamp;
    elsif s ~ '^\d{2}/\d{2}/\d{4} \d{2}:\d{2}(:\d{2})?$' then r := to_timestamp(s, 'DD/MM/YYYY HH24:MI:SS')::timestamp;
    elsif s ~ '^\d{2}/\d{2}/\d{4}$' then r := to_timestamp(s, 'DD/MM/YYYY')::timestamp;
    else return null; end if;
  exception when others then return null; end;
  return r at time zone tz;
end $$;

create or replace function import.utc_ts(t text) returns timestamptz language sql immutable as $$
  select import.zoho_ts(t, 'UTC') $$;

create or replace function import.zoho_date(t text) returns date language plpgsql immutable as $$
declare s text := import.nz(t);
begin
  if s is null then return null; end if;
  begin
    if s ~ '^\d{4}-\d{2}-\d{2}' then return left(s,10)::date;
    elsif s ~ '^\d{2}/\d{2}/\d{4}' then return to_date(left(s,10), 'DD/MM/YYYY');
    else return null; end if;
  exception when others then return null; end;
end $$;

create or replace function import.zoho_num(t text) returns numeric language plpgsql immutable as $$
declare s text := regexp_replace(coalesce(t,''), '[^0-9.\-]', '', 'g');
begin
  if s = '' or s = '-' or s = '.' then return null; end if;
  return s::numeric;
exception when others then return null; end $$;

create or replace function import.zoho_minor(t text) returns bigint language sql immutable as $$
  select round(import.zoho_num(t) * 100)::bigint $$;

create or replace function import.minor(n numeric) returns bigint language sql immutable as $$
  select round(n * 100)::bigint $$;

create or replace function import.zoho_int(t text) returns integer language sql immutable as $$
  select import.zoho_num(t)::integer $$;

create or replace function import.zoho_uuid(t text) returns uuid language plpgsql immutable as $$
begin return import.nz(t)::uuid; exception when others then return null; end $$;

create or replace function import.country_iso(t text) returns char(2) language sql immutable as $$
  select case
    when t is null then null
    when lower(btrim(t)) in ('south africa','sa','za','south-africa','rsa','suid-afrika') then 'ZA'
    when lower(btrim(t)) in ('norway','norge','noreg','no','nor') then 'NO'
    when lower(btrim(t)) in ('finland','suomi','fi','fin') then 'FI'
    when lower(btrim(t)) in ('sweden','sverige','se') then 'SE'
    when lower(btrim(t)) in ('denmark','danmark','dk') then 'DK'
    when lower(btrim(t)) in ('united kingdom','uk','gb','england') then 'GB'
    when lower(btrim(t)) in ('united states','usa','us') then 'US'
    when lower(btrim(t)) in ('germany','deutschland','de') then 'DE'
    else null end $$;

create or replace function import.market_from_country(c text) returns legacy.market_code language sql immutable as $$
  select case c when 'ZA' then 'SA'::legacy.market_code when 'NO' then 'NO'::legacy.market_code when 'FI' then 'FI'::legacy.market_code else null end $$;

create or replace function import.market_from_currency(c text) returns legacy.market_code language sql immutable as $$
  select case upper(import.nz(c)) when 'ZAR' then 'SA'::legacy.market_code when 'NOK' then 'NO'::legacy.market_code when 'EUR' then 'FI'::legacy.market_code else null end $$;

create or replace function import.market_from_org(t text) returns legacy.market_code language sql immutable as $$
  select case upper(import.nz(t))
    when 'FX-SA' then 'SA'::legacy.market_code when 'FX-ZA' then 'SA'::legacy.market_code
    when 'FX-NO' then 'NO'::legacy.market_code
    when 'FX-FI' then 'FI'::legacy.market_code when 'FX-FIN' then 'FI'::legacy.market_code
    else null end $$;

create or replace function import.market_from_financial_tool(t text) returns legacy.market_code language sql immutable as $$
  select case lower(import.nz(t)) when 'xero' then 'SA'::legacy.market_code when 'poweroffice' then 'NO'::legacy.market_code else null end $$;

create or replace function import.tenant_for_market(m legacy.market_code) returns uuid language sql stable as $$
  select id from tenants where slug = case m when 'SA' then 'fxsa' when 'NO' then 'fxno' when 'FI' then 'fxfi' end $$;

-- E.164 normalisation given a market hint. Conservative: null rather than a wrong number.
create or replace function import.phone_e164(t text, mkt legacy.market_code) returns text language plpgsql immutable as $$
declare d text := regexp_replace(coalesce(t,''), '[^0-9+]', '', 'g');
begin
  if d = '' then return null; end if;
  if d like '00%' then d := '+' || substr(d, 3); end if;
  if d like '+%' then return case when length(d) between 9 and 16 then d else null end; end if;
  if mkt = 'SA' then
    if d ~ '^0\d{9}$' then return '+27' || substr(d, 2); end if;
    if d ~ '^27\d{9}$' then return '+' || d; end if;
  elsif mkt = 'NO' then
    if d ~ '^\d{8}$' then return '+47' || d; end if;
    if d ~ '^47\d{8}$' then return '+' || d; end if;
  elsif mkt = 'FI' then
    if d ~ '^0\d{6,10}$' then return '+358' || substr(d, 2); end if;
    if d ~ '^358\d{6,10}$' then return '+' || d; end if;
  end if;
  return null;
end $$;

create or replace function import.zoho_prefix(t text) returns text language sql immutable as $$
  select case when import.nz(t) is null then null when t like 'zcrm_%' then btrim(t) else 'zcrm_' || btrim(t) end $$;

create or replace function import.booking_channel(t text) returns text language sql immutable as $$
  select case
    when import.nz(t) is null then null
    when t ilike 'wordpress%' then 'web'
    when t ilike 'appv%' then 'app'
    when t ilike 'flexibot%' then 'chatbot'
    when t ilike 'admin%' then 'operator'
    else lower(btrim(t)) end $$;

-- Parse the semi-structured AppEvents.Details column: pure JSON, or "k":"v" lines, else null.
create or replace function import.parse_details(t text) returns jsonb language plpgsql immutable as $$
declare s text := import.nz(t); j jsonb; kv jsonb := '{}'::jsonb; m text[];
begin
  if s is null then return null; end if;
  begin
    j := s::jsonb;
    if jsonb_typeof(j) = 'object' then return j; end if;
  exception when others then null; end;
  if s ~ '"[^"]+"\s*:\s*"[^"]*"' then
    for m in select regexp_matches(s, '"([^"]+)"\s*:\s*"([^"]*)"', 'g') loop
      kv := kv || jsonb_build_object(m[1], m[2]);
    end loop;
    if kv <> '{}'::jsonb then return kv; end if;
  end if;
  return null;
end $$;

-- Deterministic uuid from a namespace + string (so re-runs produce the same ids). Shaped like RFC 4122
-- version 5 (version nibble '5', variant '8') so strict validators accept it.
create or replace function import.stable_uuid(ns text, key text) returns uuid language sql immutable as $$
  select (substr(h, 1, 12) || '5' || substr(h, 14, 3) || '8' || substr(h, 18, 15))::uuid from md5(ns || ':' || key) as h $$;
