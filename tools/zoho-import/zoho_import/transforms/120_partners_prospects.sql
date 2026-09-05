-- Business partners (landlords/suppliers) and the property-prospect pipeline, incl. the dead Properties_C module.
-- optional: zoho_raw.business_partners(record_id, name, business_partner_name, type, partner_type, organisation, country, contact__id, contact_name__id, phone, email, created_time, modified_time)
-- optional: zoho_raw.property_prospects(record_id, name, property_prospect_name, status, property_address, city, country, market, building_type, gross, net, agreement_type, fx_revenue_share, fx_rev_share_85_occ, fx_project_management_fee, storebuild_margin, storebuild_status, steel_system_supplier, est_installation_cost, est_installation_start_date, est_site_open_date, project_code, installation_team__id, link_to_project_folder, status_notes, follow_up_date, business_partner__id, contact_name__id, property_prospect_owner__id, owner__id, available_area_sqm, ceiling_height_category, insulation_level, lease_term_category, lead_qualification_score, created_time, modified_time)
-- optional: zoho_raw.properties_legacy(record_id, name, property_name, status, property_address, country, created_time, modified_time)
-- optional: zoho_raw.property_status_history(record_id, subject__id, property_prospect__id, status, moved_to, duration_days, duration, created_time, modified_time)
truncate legacy.business_partners, legacy.property_prospects, legacy.property_status_history cascade;

insert into legacy.business_partners (zoho_id, market, market_source, tenant_id, name, partner_type, country_raw, country, contact_zoho_id, phone, email, organisation_raw, spec, created_at, updated_at)
select import.zoho_prefix(record_id),
       m.market, m.src, import.tenant_for_market(m.market),
       coalesce(import.nz(name), import.nz(business_partner_name), '?'),
       coalesce(import.nz(type), import.nz(partner_type)),
       coalesce(import.nz(organisation), import.nz(country)),               -- Organisation was misused as Country on this module
       import.country_iso(coalesce(import.nz(organisation), import.nz(country))),
       import.zoho_prefix(coalesce(import.nz(contact__id), import.nz(contact_name__id))),
       case when import.nz(phone) ilike 'norway' then null else import.nz(phone) end,
       lower(import.nz(email)), import.nz(organisation), to_jsonb(r) - '_src_file',
       import.zoho_ts(created_time), import.zoho_ts(modified_time)
from zoho_raw.business_partners r
cross join lateral (
  select coalesce(import.market_from_country(import.country_iso(coalesce(import.nz(organisation), import.nz(country)))), 'NO'::legacy.market_code) as market,
         case when import.market_from_country(import.country_iso(coalesce(import.nz(organisation), import.nz(country)))) is not null then 'country' else 'default' end as src) m
where import.nz(record_id) is not null;

-- unit-mix columns are the 24 labels '0.5 sqm' … '28.0 sqm' (api names sqm..sqm24 are NOT in size order → map by label)
insert into legacy.property_prospects (zoho_id, market, market_source, tenant_id, name, status, address, city, country_raw, country, building_type, gross_m2, net_m2,
  agreement_type, revenue_share_pct, revenue_share_85_occ, project_management_fee, storebuild_margin, storebuild_status, steel_supplier, est_installation_cost,
  est_installation_start, est_site_open, project_code, installation_team_zoho_id, project_folder_url, status_notes, follow_up_date, business_partner_zoho_id,
  contact_zoho_id, owner_zoho_id, landlord_form, unit_mix, extra, created_at, updated_at)
select import.zoho_prefix(record_id),
       m.market, m.src, import.tenant_for_market(m.market),
       coalesce(import.nz(name), import.nz(property_prospect_name), '?'), import.nz(status), import.nz(property_address), import.nz(city),
       coalesce(import.nz(r.country), import.nz(r.market)), import.country_iso(coalesce(import.nz(r.country), import.nz(r.market))), import.nz(building_type),
       import.zoho_num(gross), import.zoho_num(net), import.nz(agreement_type), import.zoho_num(fx_revenue_share), import.zoho_num(fx_rev_share_85_occ),
       import.zoho_num(fx_project_management_fee), import.zoho_num(storebuild_margin), import.nz(storebuild_status), import.nz(steel_system_supplier),
       import.zoho_num(est_installation_cost), import.zoho_date(est_installation_start_date), import.zoho_date(est_site_open_date), import.nz(project_code),
       import.zoho_prefix(installation_team__id), import.nz(link_to_project_folder), import.nz(status_notes), import.zoho_date(follow_up_date),
       import.zoho_prefix(business_partner__id), import.zoho_prefix(contact_name__id), import.zoho_prefix(coalesce(property_prospect_owner__id, owner__id)),
       jsonb_strip_nulls(jsonb_build_object('available_area_sqm', import.nz(available_area_sqm), 'ceiling_height_category', import.nz(ceiling_height_category),
                                            'insulation_level', import.nz(insulation_level), 'lease_term_category', import.nz(lease_term_category),
                                            'lead_qualification_score', import.nz(lead_qualification_score))),
       (select coalesce(jsonb_object_agg(regexp_replace(key, '^_?(\d+)_(\d+)_sqm$', '\1.\2'), import.zoho_num(value)) filter (where value is not null and value <> ''), '{}'::jsonb)
          from jsonb_each_text(to_jsonb(r)) where key ~ '^_?\d+_\d+_sqm$'),
       to_jsonb(r) - '_src_file', import.zoho_ts(created_time), import.zoho_ts(modified_time)
from zoho_raw.property_prospects r
cross join lateral (
  select coalesce(import.market_from_country(import.country_iso(coalesce(import.nz(r.country), import.nz(r.market)))), 'NO'::legacy.market_code) as market,
         case when import.market_from_country(import.country_iso(coalesce(import.nz(r.country), import.nz(r.market)))) is not null then 'country' else 'default' end as src) m
where import.nz(record_id) is not null;

-- Properties_C (13 SA rows, Oct–Nov 2023): every one also exists in Property Prospects → keep as flagged duplicates, never mapped to core
insert into legacy.property_prospects (zoho_id, market, market_source, tenant_id, name, status, address, country_raw, country, is_legacy_property, extra, created_at, updated_at)
select import.zoho_prefix(record_id), 'SA', 'module', import.tenant_for_market('SA'),
       coalesce(import.nz(name), import.nz(property_name), '?'), import.nz(status), import.nz(property_address),
       import.nz(country), import.country_iso(import.nz(country)), true, to_jsonb(r) - '_src_file', import.zoho_ts(created_time), import.zoho_ts(modified_time)
from zoho_raw.properties_legacy r
where import.nz(record_id) is not null
on conflict (zoho_id) do nothing;

insert into legacy.property_status_history (zoho_id, tenant_id, prospect_zoho_id, from_status, to_status, duration_days, duration_text, changed_at)
select import.zoho_prefix(h.record_id), p.tenant_id, p.zoho_id, import.nz(h.status), import.nz(h.moved_to), import.zoho_int(h.duration_days), import.nz(h.duration),
       import.zoho_ts(coalesce(h.modified_time, h.created_time))
from zoho_raw.property_status_history h
join legacy.property_prospects p on p.zoho_id = import.zoho_prefix(coalesce(h.subject__id, h.property_prospect__id))
where import.nz(h.record_id) is not null;
