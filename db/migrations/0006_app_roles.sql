-- ============================================================================
-- 0006  Application login role + auth helpers
-- The API connects as app_user (member of `app`, no BYPASSRLS). The password
-- comes from the psql variable :app_password (db/apply.sh sets it from
-- APP_DB_PASSWORD, default 'app' for local development only).
-- ============================================================================
set client_min_messages = warning;

do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'app_user') then
    execute format('create role app_user login password %L in role app', current_setting('fxpms.app_password', true));
  else
    execute format('alter role app_user password %L', current_setting('fxpms.app_password', true));
  end if;
end $$;
alter role app_user set search_path = public, legacy;

create schema if not exists auth;
grant usage on schema auth to app, app_import;

-- Resolve a caller before any RLS scope exists. SECURITY DEFINER: runs as the migration owner, returns only what the
-- API needs to build the scope. The API must still refuse tenants that are not in the returned memberships.
create or replace function auth.resolve_user(p_email text)
returns table (user_json jsonb, memberships jsonb)
language sql security definer set search_path = public as $$
  with u as (select * from users where email = p_email and status = 'active' limit 1),
  m as (
    select t.id as tenant_id, t.slug, t.name, tm.role::text as role, t.currency, t.locale, t.timezone, t.country
    from u
    join tenants t on (t.org_id = u.org_id and u.is_org_admin) or exists (select 1 from tenant_memberships x where x.user_id = u.id and x.tenant_id = t.id)
    left join tenant_memberships tm on tm.user_id = u.id and tm.tenant_id = t.id
    where t.status = 'active'
  )
  select (select jsonb_build_object('id', u.id, 'email', u.email, 'full_name', u.full_name, 'is_org_admin', u.is_org_admin, 'org_id', u.org_id) from u),
         coalesce((select jsonb_agg(jsonb_build_object('tenant_id', m.tenant_id, 'slug', m.slug, 'name', m.name,
                    'role', coalesce(m.role, 'super_admin'), 'currency', m.currency, 'locale', m.locale, 'timezone', m.timezone, 'country', m.country) order by m.slug) from m), '[]'::jsonb)
$$;
revoke all on function auth.resolve_user(text) from public;
grant execute on function auth.resolve_user(text) to app;
