-- legacy.leads → leads. Zoho never converted a lead (Is Converted = false on all rows) and Lead Status is unused,
-- so stage is derived: created within 30 days of the newest lead → 'new', older → 'lost' (loss_reason_code 'stale_import').
-- requires: legacy.leads(zoho_id)
insert into leads (id, tenant_id, lead_number, name, email, phone, company, source, site_id, stage, matched_customer_id, loss_reason_code, lost_at, attribution, web_activity, owner_user_id,
  origin, source_ref, created_at, updated_at)
select import.stable_uuid('lead', l.zoho_id), l.tenant_id, 'L-' || (1000 + row_number() over (partition by l.tenant_id order by l.created_at, l.zoho_id)),
       coalesce(l.full_name, l.email, l.phone_raw, '?'), l.email, l.phone_e164, l.company,
       case when l.is_old_contact then 'webform' when l.lead_source ilike 'chat%' then 'chat' when l.lead_source ilike 'website%' then 'website' when l.lead_source ilike '%ads%' then 'google-ads' else lower(coalesce(l.lead_source, 'website')) end,
       null,
       case when l.is_converted then 'converted' when l.created_at >= (select max(created_at) from legacy.leads) - interval '30 days' then 'new' else 'lost' end::lead_stage,
       cu.id,
       case when not l.is_converted and l.created_at < (select max(created_at) from legacy.leads) - interval '30 days' then 'stale_import' end,
       case when not l.is_converted and l.created_at < (select max(created_at) from legacy.leads) - interval '30 days' then l.updated_at end,
       l.ads || jsonb_strip_nulls(jsonb_build_object('referrer', l.web_activity->>'referrer', 'first_page', l.web_activity->>'first_page_visited', 'city', l.city, 'state', l.state)),
       l.web_activity, u.id, 'zoho', l.zoho_id, l.created_at, l.updated_at
from legacy.leads l
left join legacy.contacts lc on lc.zoho_id = l.matched_contact_zoho_id
left join customers cu on cu.id = coalesce(lc.appuser_uuid, import.stable_uuid('customer', l.matched_contact_zoho_id)) and cu.tenant_id = l.tenant_id
left join users u on u.source = 'zoho' and u.source_ref = l.owner_zoho_id;

insert into tenant_counters (tenant_id, key, value)
select tenant_id, 'lead', max(split_part(lead_number, '-', 2)::bigint) from leads group by tenant_id
on conflict (tenant_id, key) do update set value = greatest(tenant_counters.value, excluded.value);

insert into campaigns (id, tenant_id, name, kind, status, start_date, end_date, budget_minor, actual_cost_minor, currency, attributes, source, source_ref, created_at)
select import.stable_uuid('campaign', c.zoho_id), c.tenant_id, c.name,
       case when c.campaign_type ilike '%ads%' or c.name ilike '%search%' then 'google-ads' when c.campaign_type ilike '%mail%' or c.campaign_type ilike '%newsletter%' then 'newsletter' else lower(coalesce(c.campaign_type, 'other')) end,
       c.status, c.start_date, c.end_date, import.minor(c.budget), import.minor(c.actual_cost), c.currency, c.extra, 'zoho', c.zoho_id, c.created_at
from legacy.campaigns c where c.tenant_id is not null;

insert into lead_campaigns (lead_id, campaign_id, status, created_at)
select l.id, c.id, m.status, m.created_at
from legacy.campaign_lead_members m
join leads l on l.origin = 'zoho' and l.source_ref = m.lead_zoho_id
join campaigns c on c.source = 'zoho' and c.source_ref = m.campaign_zoho_id
on conflict do nothing;
