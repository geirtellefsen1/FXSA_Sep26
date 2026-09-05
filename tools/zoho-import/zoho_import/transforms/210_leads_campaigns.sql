-- Leads (SalesIQ) + Old Contacts (2022-23 SA web forms) + Google Ads / newsletter campaigns.
-- optional: zoho_raw.leads(record_id, lead_source, lead_status, first_name, last_name, full_name, company, email, phone, mobile, city, state, country, description, is_converted, lead_owner__id, gclid, zcampaignid, adgroup_id, ad_id, keyword_id, keyword, click_type, device_type, ad_network, ad_campaign_name, adgroup_name, ad, click_date, cost_per_click, cost_per_conversion, conversion_exported_on, conversion_export_status, reason_for_conversion_failure, first_visit, most_recent_visit, days_visited, number_of_chats, referrer, first_page_visited, average_time_spent_minutes, visitor_score, created_time, modified_time)
-- optional: zoho_raw.old_contacts(record_id, name, first_name, last_name, email, phone, mobile, city, country, form_type, type, message, description, created_time, modified_time)
-- optional: zoho_raw.campaigns(record_id, campaign_name, type, status, start_date, end_date, budgeted_cost, actual_cost, currency, created_time)
-- optional: zoho_raw.campaign_lead_members(record_id, campaign__id, campaign_name__id, lead__id, lead_name__id, member_status, status, created_time)
truncate legacy.leads, legacy.campaigns, legacy.campaign_lead_members cascade;

insert into legacy.leads (zoho_id, tenant_id, market, market_source, is_old_contact, lead_source, lead_status, first_name, last_name, full_name, company, email, phone_raw, phone_e164, city, state,
  country_raw, country, description, matched_contact_zoho_id, is_converted, web_activity, ads, owner_zoho_id, extra, created_at, updated_at)
select import.zoho_prefix(l.record_id), import.tenant_for_market(m.market), m.market, m.src, false, import.nz(l.lead_source), import.nz(l.lead_status), import.nz(l.first_name), import.nz(l.last_name),
       coalesce(import.nz(l.full_name), nullif(trim(coalesce(import.nz(l.first_name),'') || ' ' || coalesce(import.nz(l.last_name),'')), '')), import.nz(l.company), lower(import.nz(l.email)),
       coalesce(import.nz(l.mobile), import.nz(l.phone)), import.phone_e164(coalesce(l.mobile, l.phone), m.market), import.nz(l.city), import.nz(l.state), import.nz(l.country), import.country_iso(l.country),
       import.nz(l.description), lc.zoho_id, coalesce(import.zoho_bool(l.is_converted), false),
       jsonb_strip_nulls(jsonb_build_object('first_visit', import.zoho_ts(l.first_visit), 'most_recent_visit', import.zoho_ts(l.most_recent_visit), 'days_visited', import.zoho_int(l.days_visited),
         'number_of_chats', import.zoho_int(l.number_of_chats), 'referrer', import.nz(l.referrer), 'first_page_visited', import.nz(l.first_page_visited),
         'average_time_spent', import.nz(l.average_time_spent_minutes), 'visitor_score', import.nz(l.visitor_score))),
       jsonb_strip_nulls(jsonb_build_object('gclid', import.nz(l.gclid), 'campaign_id', import.nz(l.zcampaignid), 'adgroup_id', import.nz(l.adgroup_id), 'ad_id', import.nz(l.ad_id),
         'keyword_id', import.nz(l.keyword_id), 'keyword', import.nz(l.keyword), 'click_type', import.nz(l.click_type), 'device_type', import.nz(l.device_type), 'ad_network', import.nz(l.ad_network),
         'campaign_name', import.nz(l.ad_campaign_name), 'adgroup_name', import.nz(l.adgroup_name), 'ad', import.nz(l.ad), 'click_date', import.nz(l.click_date), 'cost_per_click', import.zoho_num(l.cost_per_click),
         'cost_per_conversion', import.zoho_num(l.cost_per_conversion), 'conversion_exported_on', import.nz(l.conversion_exported_on), 'conversion_export_status', import.nz(l.conversion_export_status),
         'failure_reason', import.nz(l.reason_for_conversion_failure))),
       import.zoho_prefix(l.lead_owner__id), to_jsonb(l) - '_src_file', import.zoho_ts(l.created_time), import.zoho_ts(l.modified_time)
from zoho_raw.leads l
left join legacy.contacts lc on lc.email = lower(import.nz(l.email)) and lc.population <> 'web_visitor'
cross join lateral (
  select coalesce(import.market_from_country(import.country_iso(l.country)), lc.market, 'NO'::legacy.market_code) as market,
         case when import.market_from_country(import.country_iso(l.country)) is not null then 'country' when lc.market is not null then 'contact' else 'default' end as src) m
where import.nz(l.record_id) is not null;

insert into legacy.leads (zoho_id, tenant_id, market, market_source, is_old_contact, lead_source, lead_status, first_name, last_name, full_name, email, phone_raw, phone_e164, city, country_raw, country,
  description, matched_contact_zoho_id, is_converted, owner_zoho_id, extra, created_at, updated_at)
select import.zoho_prefix(o.record_id), import.tenant_for_market('SA'), 'SA', 'module', true, 'legacy_webform', coalesce(import.nz(o.form_type), import.nz(o.type)), import.nz(o.first_name), import.nz(o.last_name),
       coalesce(import.nz(o.name), nullif(trim(coalesce(import.nz(o.first_name),'') || ' ' || coalesce(import.nz(o.last_name),'')), ''), '?'), lower(import.nz(o.email)),
       coalesce(import.nz(o.mobile), import.nz(o.phone)), import.phone_e164(coalesce(o.mobile, o.phone), 'SA'), import.nz(o.city), import.nz(o.country), coalesce(import.country_iso(o.country), 'ZA'),
       coalesce(import.nz(o.message), import.nz(o.description)), lc.zoho_id, false, null, to_jsonb(o) - '_src_file', import.zoho_ts(o.created_time), import.zoho_ts(o.modified_time)
from zoho_raw.old_contacts o
left join legacy.contacts lc on lc.email = lower(import.nz(o.email)) and lc.population <> 'web_visitor'
where import.nz(o.record_id) is not null
on conflict (zoho_id) do nothing;

insert into legacy.campaigns (zoho_id, tenant_id, name, campaign_type, status, start_date, end_date, budget, actual_cost, currency, extra, created_at)
select import.zoho_prefix(c.record_id), null, coalesce(import.nz(c.campaign_name), '?'), import.nz(c.type), import.nz(c.status), import.zoho_date(c.start_date), import.zoho_date(c.end_date),
       import.zoho_num(c.budgeted_cost), import.zoho_num(c.actual_cost), upper(import.nz(c.currency)), to_jsonb(c) - '_src_file', import.zoho_ts(c.created_time)
from zoho_raw.campaigns c where import.nz(c.record_id) is not null;

insert into legacy.campaign_lead_members (zoho_id, tenant_id, campaign_zoho_id, lead_zoho_id, status, created_at)
select import.zoho_prefix(m.record_id), l.tenant_id, import.zoho_prefix(coalesce(m.campaign__id, m.campaign_name__id)), l.zoho_id, coalesce(import.nz(m.member_status), import.nz(m.status)), import.zoho_ts(m.created_time)
from zoho_raw.campaign_lead_members m
join legacy.leads l on l.zoho_id = import.zoho_prefix(coalesce(m.lead__id, m.lead_name__id))
where import.nz(m.record_id) is not null;

-- campaigns get the tenant of the majority of their leads (Google Ads campaigns are SA; newsletters mostly NO)
update legacy.campaigns c set tenant_id = t.tenant_id
from (select campaign_zoho_id, tenant_id, row_number() over (partition by campaign_zoho_id order by count(*) desc) rn from legacy.campaign_lead_members group by 1,2) t
where t.campaign_zoho_id = c.zoho_id and t.rn = 1;
