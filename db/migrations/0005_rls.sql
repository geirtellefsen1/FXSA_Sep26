-- ============================================================================
-- 0005  Row-level security
-- The app connects as role `app` (NOBYPASSRLS) and sets per request:
--   set local app.tenant_ids = '<uuid>,<uuid>';   -- tenants this user may see
--   set local app.user_id    = '<uuid>';
-- Org admins get every tenant of their org. The importer connects as
-- `app_import` (BYPASSRLS) and never runs under RLS.
-- ============================================================================
set client_min_messages = warning;

do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'app') then create role app nologin nobypassrls; end if;
  if not exists (select 1 from pg_roles where rolname = 'app_import') then create role app_import nologin bypassrls; end if;
end $$;

-- STABLE + PARALLEL SAFE: evaluated once per query, so the policy predicate collapses to an index-friendly
-- `tenant_id = any('{...}')`. Every tenant-bearing table indexes tenant_id first.
create or replace function app_tenant_ids() returns uuid[] language sql stable parallel safe as $$
  select coalesce(
    (select array_agg(x::uuid) from unnest(string_to_array(nullif(current_setting('app.tenant_ids', true), ''), ',')) as x),
    '{}'::uuid[]) $$;

create or replace function app_user_id() returns uuid language sql stable parallel safe as $$
  select nullif(current_setting('app.user_id', true), '')::uuid $$;

do $$
declare r record;
begin
  for r in
    select n.nspname, c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    join pg_attribute a on a.attrelid = c.oid and a.attname = 'tenant_id' and not a.attisdropped
    where n.nspname in ('public','legacy') and c.relkind in ('r','p') and not c.relispartition
  loop
    execute format('alter table %I.%I enable row level security', r.nspname, r.relname);
    execute format('alter table %I.%I force row level security', r.nspname, r.relname);
    execute format('drop policy if exists tenant_isolation on %I.%I', r.nspname, r.relname);
    execute format('create policy tenant_isolation on %I.%I using (tenant_id = any (app_tenant_ids())) with check (tenant_id = any (app_tenant_ids()))', r.nspname, r.relname);
  end loop;
end $$;

-- users: visible when they share at least one tenant with the caller (or are the caller)
alter table users enable row level security;
alter table users force row level security;
drop policy if exists users_shared_tenant on users;
create policy users_shared_tenant on users using (
  id = app_user_id() or exists (select 1 from tenant_memberships m where m.user_id = users.id and m.tenant_id = any (app_tenant_ids())));

-- tenant_counters, agent_settings, corporate_unit_users, customer_tags, lead_campaigns: no tenant_id column → derive
alter table customer_tags enable row level security; alter table customer_tags force row level security;
create policy via_customer on customer_tags using (exists (select 1 from customers c where c.id = customer_tags.customer_id and c.tenant_id = any (app_tenant_ids())));
alter table lead_campaigns enable row level security; alter table lead_campaigns force row level security;
create policy via_lead on lead_campaigns using (exists (select 1 from leads l where l.id = lead_campaigns.lead_id and l.tenant_id = any (app_tenant_ids())));
alter table corporate_unit_users enable row level security; alter table corporate_unit_users force row level security;
create policy via_subscription on corporate_unit_users using (exists (select 1 from subscriptions s where s.id = corporate_unit_users.subscription_id and s.tenant_id = any (app_tenant_ids())));
alter table invoice_lines enable row level security; alter table invoice_lines force row level security;
create policy via_invoice on invoice_lines using (exists (select 1 from invoices i where i.id = invoice_lines.invoice_id and i.tenant_id = any (app_tenant_ids())));
alter table arrears_actions enable row level security; alter table arrears_actions force row level security;
create policy via_case on arrears_actions using (exists (select 1 from arrears_cases a where a.id = arrears_actions.case_id and a.tenant_id = any (app_tenant_ids())));
alter table auction_bids enable row level security; alter table auction_bids force row level security;
create policy via_auction on auction_bids using (exists (select 1 from auctions a where a.id = auction_bids.auction_id and a.tenant_id = any (app_tenant_ids())));

alter table tenants enable row level security;
alter table tenants force row level security;
drop policy if exists tenant_self on tenants;
create policy tenant_self on tenants using (id = any (app_tenant_ids()));

grant usage on schema public, legacy to app, app_import;
grant select, insert, update, delete on all tables in schema public, legacy to app, app_import;
grant usage on all sequences in schema public to app, app_import;
grant execute on function next_number(uuid, text), app_tenant_ids(), app_user_id() to app, app_import;
grant usage on schema import, zoho_raw to app_import;
grant all on all tables in schema import to app_import;
grant usage on schema import to app;
grant select on import.runs, import.checks, import.files to app;
alter default privileges in schema public grant select, insert, update, delete on tables to app, app_import;
alter default privileges in schema legacy grant select, insert, update, delete on tables to app, app_import;
