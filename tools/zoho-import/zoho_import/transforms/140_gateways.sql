-- Gateways (Raspberry Pi lock controllers) and their country-movement log. Market via facility, else Add State / Orginisation.
-- optional: zoho_raw.gateways(record_id, name, gateway_name, facility__id, serial, serial_number, mac, mac_address, mac_ethernet, mac_wifi, wifi_mac, ip, ip_address, software_version, hardware_version, raspbian_version, connected_controllers, expected_boards, main_entrance_lock, main_entrance_name, connectivity_status, controller_error, power_source, add_state, placement, last_report, orginisation, organisation, created_time, modified_time)
-- optional: zoho_raw.gateway_country_history(record_id, subject__id, gateway__id, country, moved_to, duration_days, created_time, modified_time)
truncate legacy.gateways, legacy.gateway_country_history cascade;
insert into legacy.gateways (zoho_id, tenant_id, market, market_source, facility_zoho_id, name, serial, mac_eth, mac_wifi, ip_address, software_version, hardware_version,
  raspbian_version, connected_controllers, expected_boards, main_entrance_lock, main_entrance_name, connectivity_status, controller_error, power_source, add_state, placement,
  last_report_at, organisation_raw, extra, created_at, updated_at)
select import.zoho_prefix(g.record_id), import.tenant_for_market(m.market), m.market, m.src, f.zoho_id,
       coalesce(import.nz(g.name), import.nz(g.gateway_name), '?'), coalesce(import.nz(g.serial), import.nz(g.serial_number)),
       coalesce(import.nz(g.mac_ethernet), import.nz(g.mac_address), import.nz(g.mac)), coalesce(import.nz(g.mac_wifi), import.nz(g.wifi_mac)),
       coalesce(import.nz(g.ip_address), import.nz(g.ip)), import.nz(g.software_version), import.nz(g.hardware_version), import.nz(g.raspbian_version),
       import.nz(g.connected_controllers), import.nz(g.expected_boards), import.zoho_bool(g.main_entrance_lock), import.nz(g.main_entrance_name),
       upper(import.nz(g.connectivity_status)), import.zoho_bool(g.controller_error), import.nz(g.power_source), import.nz(g.add_state), import.nz(g.placement),
       import.zoho_ts(g.last_report), coalesce(import.nz(g.orginisation), import.nz(g.organisation)), to_jsonb(g) - '_src_file',
       import.zoho_ts(g.created_time), import.zoho_ts(g.modified_time)
from zoho_raw.gateways g
left join legacy.facilities f on f.zoho_id = import.zoho_prefix(g.facility__id)
cross join lateral (
  select coalesce(f.market,
                  case when g.add_state ilike '%south africa%' then 'SA'::legacy.market_code when g.add_state ilike '%norway%' then 'NO'::legacy.market_code end,
                  import.market_from_org(coalesce(g.orginisation, g.organisation)), 'NO'::legacy.market_code) as market,
         case when f.market is not null then 'facility' when g.add_state ilike '%south africa%' or g.add_state ilike '%norway%' then 'add_state'
              when import.market_from_org(coalesce(g.orginisation, g.organisation)) is not null then 'organisation' else 'default' end as src) m
where import.nz(g.record_id) is not null;

insert into legacy.gateway_country_history (zoho_id, tenant_id, gateway_zoho_id, from_country, to_country, duration_days, changed_at)
select import.zoho_prefix(h.record_id), g.tenant_id, g.zoho_id, import.nz(h.country), import.nz(h.moved_to), import.zoho_int(h.duration_days), import.zoho_ts(coalesce(h.modified_time, h.created_time))
from zoho_raw.gateway_country_history h
join legacy.gateways g on g.zoho_id = import.zoho_prefix(coalesce(h.subject__id, h.gateway__id))
where import.nz(h.record_id) is not null;
