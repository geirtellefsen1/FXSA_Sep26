-- Facilities (Zoho PriceBooks). Market from Country (100% filled). Counters kept only as a flagged snapshot.
-- requires: zoho_raw.facilities(record_id, facility_name, country)
-- optional: zoho_raw.facilities(facilityid, department_code, finance_tool_code, active, street, city, postal_code, region, location_latitude, location_longitude, google_maps_url, google_maps, google_review_link, currency_code, total_number_of_lettable_units, nett_lettable_area_m2, gross_floor_area_m2, service_units, service_unit_label, agreement_type, franchise_agreement, monthly_franchise_fee, franchise_fee_currency, commission_date, property_prospect__id, mezzanine, mezzanine_height_mm, system_height, floor, access_height_limit_m, lift_type, lift_measurements, trolleys, pallet_jacks, camera_system, network_system, total_locks, main_entrance_lock_type, bomb_shelter, bomb_shelter_note, englishsms, norwegiansms, app_link_android, app_link_ios, description, reserved_paid, available, not_available, reserved_payment_problem, reserved_cancelling, reserved_pending, checked_out, current_occupancy_percentage, price_book_owner__id, facility_owner__id, owner__id, organisation, created_time, modified_time)
truncate legacy.facilities cascade;
insert into legacy.facilities (zoho_id, tenant_id, market, market_source, facility_uuid, name, department_code, finance_tool_code, active, street, city, postal_code, region,
  country_raw, country, lat, lng, google_maps_url, google_review_url, currency, lettable_units, nla_m2, gfa_m2, service_units, service_unit_label, agreement_type,
  franchise_agreement, monthly_franchise_fee, franchise_fee_currency, commission_date, property_prospect_zoho_id, physical_spec, security_spec, sms_template_en, sms_template_no,
  app_link_android, app_link_ios, description, occupancy_counters, occupancy_counters_at, owner_zoho_id, extra, created_at, updated_at)
select import.zoho_prefix(record_id), import.tenant_for_market(m.market), m.market, m.src,
       import.zoho_uuid(facilityid), import.nz(facility_name), import.nz(department_code), import.nz(finance_tool_code), coalesce(import.zoho_bool(active), true),
       import.nz(street), import.nz(city), import.nz(postal_code), import.nz(region), import.nz(country), import.country_iso(country),
       import.zoho_num(location_latitude), import.zoho_num(location_longitude), coalesce(import.nz(google_maps_url), import.nz(google_maps)), import.nz(google_review_link),
       coalesce(upper(import.nz(currency_code)), case m.market when 'SA' then 'ZAR' when 'NO' then 'NOK' when 'FI' then 'EUR' end),
       import.zoho_int(total_number_of_lettable_units), import.zoho_num(nett_lettable_area_m2), import.zoho_num(gross_floor_area_m2),
       import.zoho_int(service_units), import.nz(service_unit_label), import.nz(agreement_type), import.nz(franchise_agreement), import.zoho_num(monthly_franchise_fee),
       upper(import.nz(franchise_fee_currency)), import.zoho_date(commission_date), import.zoho_prefix(property_prospect__id),
       jsonb_strip_nulls(jsonb_build_object('mezzanine', import.nz(mezzanine), 'mezzanine_height_mm', import.nz(mezzanine_height_mm), 'system_height', import.nz(system_height),
         'floor', import.nz(floor), 'access_height_limit_m', import.nz(access_height_limit_m), 'lift_type', import.nz(lift_type), 'lift_measurements', import.nz(lift_measurements),
         'trolleys', import.nz(trolleys), 'pallet_jacks', import.nz(pallet_jacks))),
       jsonb_strip_nulls(jsonb_build_object('camera_system', import.nz(camera_system), 'network_system', import.nz(network_system), 'total_locks', import.nz(total_locks),
         'main_entrance_lock_type', import.nz(main_entrance_lock_type), 'bomb_shelter', import.nz(bomb_shelter), 'bomb_shelter_note', import.nz(bomb_shelter_note))),
       import.nz(englishsms), import.nz(norwegiansms), import.nz(app_link_android), import.nz(app_link_ios), import.nz(description),
       jsonb_strip_nulls(jsonb_build_object('RESERVED_PAID', import.zoho_int(reserved_paid), 'AVAILABLE', import.zoho_int(available), 'NOT_AVAILABLE', import.zoho_int(not_available),
         'RESERVED_PAYMENT_PROBLEM', import.zoho_int(reserved_payment_problem), 'RESERVED_CANCELLING', import.zoho_int(reserved_cancelling),
         'RESERVED_PENDING', import.zoho_int(reserved_pending), 'CHECKED_OUT', import.zoho_int(checked_out), 'occupancy_pct', import.zoho_num(current_occupancy_percentage),
         'stale', true, 'note', 'counter sync dead since 2025-12-10; compute occupancy from units')),
       import.zoho_ts(modified_time),
       import.zoho_prefix(coalesce(price_book_owner__id, facility_owner__id, owner__id)),
       to_jsonb(r) - '_src_file' - 'guest_wifi_password',                      -- never carry the shared WiFi password forward
       import.zoho_ts(created_time), import.zoho_ts(modified_time)
from zoho_raw.facilities r
cross join lateral (
  select coalesce(import.market_from_country(import.country_iso(r.country)), import.market_from_currency(r.currency_code), import.market_from_org(r.organisation), 'NO'::legacy.market_code) as market,
         case when import.market_from_country(import.country_iso(r.country)) is not null then 'country'
              when import.market_from_currency(r.currency_code) is not null then 'currency'
              when import.market_from_org(r.organisation) is not null then 'organisation' else 'default' end as src) m
where import.nz(record_id) is not null;
