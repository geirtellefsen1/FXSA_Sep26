-- legacy.zoho_users → users + tenant_memberships. Role names in the Zoho org encode both level and market:
--   'Super Administrator' → org admin (super_admin on every tenant); 'Manager <Country>' → admin; 'Support Agent <Countries>' → operator.
-- requires: legacy.zoho_users(zoho_id)
--
-- The backup importer is an initial full load: every core table that the import fills is emptied here, in one
-- statement (so no CASCADE is needed and nothing outside this list is touched). Users are upserted, not truncated.
-- Delta syncs (Phase 1) upsert on (tenant_id, source, source_ref) and never run this file.
truncate sites, zones, unit_types, units, devices, landlords, site_agreements,
         customers, corporate_accounts, corporate_users, corporate_unit_users, customer_tags, payment_instruments,
         subscriptions, reservations, invoices, invoice_lines, payments, pricing_rules, price_history,
         leads, campaigns, lead_campaigns, conversations, messages, ai_drafts, agent_proposals, incidents, tech_tickets,
         arrears_cases, arrears_actions, auctions, auction_bids, notes, documents, activity_log, tenant_counters;
delete from tenant_memberships m using users u where u.id = m.user_id and u.source = 'zoho';
insert into users (id, email, first_name, last_name, status, is_org_admin, org_id, timezone, source, source_ref)
select import.stable_uuid('user', zu.zoho_id), zu.email, zu.first_name, zu.last_name,
       case zu.status when 'ACTIVE' then 'active' when 'DISABLED' then 'disabled' else 'closed' end,
       coalesce(zu.role_name, zu.profile, '') ilike '%super admin%' or coalesce(zu.role_name,'') ilike '%ceo%',
       (select id from orgs where slug = 'flexistore'), zu.timezone, 'zoho', zu.zoho_id
from legacy.zoho_users zu
on conflict (email) do update set first_name = excluded.first_name, last_name = excluded.last_name, status = excluded.status, source_ref = excluded.source_ref;

insert into tenant_memberships (tenant_id, user_id, role)
select t.id, u.id,
       case when u.is_org_admin then 'super_admin'::staff_role
            when zu.role_name ilike '%manager%' or zu.role_name ilike '%administrator%' then 'admin'
            when zu.role_name ilike '%support%' or zu.role_name ilike '%agent%' then 'operator'
            else 'viewer' end
from legacy.zoho_users zu
join users u on u.source = 'zoho' and u.source_ref = zu.zoho_id
join tenants t on t.org_id = u.org_id and (
       u.is_org_admin
    or (t.slug = 'fxsa' and zu.role_name ilike '%south africa%')
    or (t.slug = 'fxno' and zu.role_name ilike '%norway%')
    or (t.slug = 'fxfi' and zu.role_name ilike '%finland%')
    or (zu.role_name is null or zu.role_name not ilike any (array['%south africa%','%norway%','%finland%'])))
on conflict (tenant_id, user_id) do update set role = excluded.role;
