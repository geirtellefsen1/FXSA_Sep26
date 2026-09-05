-- legacy facilities/units/gateways → sites, zones, unit_types, units, devices (gateway → board/hub → lock topology), landlords.
-- requires: legacy.facilities(zoho_id)
-- requires: legacy.units(zoho_id)

-- Landlords from Business Partners of type Property Owner (all others stay legacy-only)
insert into landlords (id, tenant_id, name, kind, contact_email, contact_phone, source, source_ref)
select import.stable_uuid('landlord', bp.zoho_id), bp.tenant_id, bp.name, 'company', bp.email, bp.phone, 'zoho', bp.zoho_id
from legacy.business_partners bp where bp.partner_type ilike 'property owner%' and bp.tenant_id is not null;

with base as (
  select f.*, t.settings->>'size_unit' as size_unit,
         upper(coalesce(nullif(regexp_replace(coalesce(f.department_code,''), '[^A-Za-z]', '', 'g'), ''), regexp_replace(f.name, '[^A-Za-z]', '', 'g'), 'FAC')) as letters,
         lower(regexp_replace(regexp_replace(f.name, '[^A-Za-z0-9]+', '-', 'g'), '(^-|-$)', '', 'g')) as slug0
  from legacy.facilities f join tenants t on t.id = f.tenant_id
), coded as (
  select b.*, left(b.letters, 3) as code0,
         row_number() over (partition by b.tenant_id, left(b.letters, 3) order by b.created_at, b.zoho_id) as code_rn,
         row_number() over (partition by b.tenant_id, b.slug0 order by b.created_at, b.zoho_id) as slug_rn
  from base b
)
insert into sites (id, tenant_id, slug, short_code, name, city, region, address, postal_code, country, lat, lng, currency, accounting_code, landlord_id,
  gross_m2, lettable_m2, physical_spec, security_config, status, launched_at, source, source_ref, created_at, updated_at)
select coalesce(c.facility_uuid, import.stable_uuid('site', c.zoho_id)), c.tenant_id,
       case when c.slug_rn = 1 then c.slug0 else c.slug0 || '-' || c.slug_rn end,
       case when c.code_rn = 1 then rpad(c.code0, 3, 'X') else left(c.code0, 2) || (c.code_rn - 1) end,
       c.name, c.city, c.region, c.street, c.postal_code, c.country, c.lat, c.lng, c.currency, c.department_code,
       (select l.id from legacy.property_prospects pp join legacy.business_partners bp on bp.zoho_id = pp.business_partner_zoho_id
          join landlords l on l.source_ref = bp.zoho_id where pp.zoho_id = c.property_prospect_zoho_id limit 1),
       c.gfa_m2, c.nla_m2,
       c.physical_spec || jsonb_strip_nulls(jsonb_build_object('lettable_units_declared', c.lettable_units, 'service_units', c.service_units, 'service_unit_label', c.service_unit_label,
                                                              'google_maps_url', c.google_maps_url, 'google_review_url', c.google_review_url, 'description', c.description,
                                                              'sms_template_en', c.sms_template_en, 'sms_template_no', c.sms_template_no, 'app_link_android', c.app_link_android, 'app_link_ios', c.app_link_ios)),
       c.security_spec,
       case when c.active then 'live'::site_status else 'paused'::site_status end, c.commission_date, 'zoho', c.zoho_id, c.created_at, c.updated_at
from coded c;

-- Landlord agreement from the facility's commercial fields (+ the prospect it came from)
insert into site_agreements (tenant_id, site_id, landlord_id, agreement_type, rev_share_pct, rent_minor, currency, lease_start, source, source_ref)
select s.tenant_id, s.id, s.landlord_id,
       case when f.agreement_type ilike 'revenue%' then 'revenue_share' when f.agreement_type ilike 'fixed%' then 'fixed_rent' when f.franchise_agreement is not null then 'franchise' else 'other' end,
       pp.revenue_share_pct, import.minor(f.monthly_franchise_fee), coalesce(f.franchise_fee_currency, s.currency), f.commission_date, 'zoho', f.zoho_id
from sites s join legacy.facilities f on f.zoho_id = s.source_ref
left join legacy.property_prospects pp on pp.zoho_id = f.property_prospect_zoho_id
where f.agreement_type is not null or f.franchise_agreement is not null;

-- One default zone per site; the floor-plan editor (Phase 4) splits it later
insert into zones (id, tenant_id, site_id, code, name, kind)
select import.stable_uuid('zone', s.id::text), s.tenant_id, s.id, 'A', 'All units', null from sites s;

-- Unit types = distinct size labels per facility
insert into unit_types (id, tenant_id, site_id, name, size_value, size_unit, currency, source, source_ref)
select import.stable_uuid('unit_type', s.id::text || '|' || lu.size_label), s.tenant_id, s.id, lu.size_label,
       import.zoho_num((regexp_match(lu.size_label, '(\d+([.,]\d+)?)'))[1]),
       coalesce(t.settings->>'size_unit', 'm2'), s.currency, 'zoho', lu.size_label
from (select distinct facility_zoho_id, size_label from legacy.units where size_label is not null) lu
join sites s on s.source_ref = lu.facility_zoho_id
join tenants t on t.id = s.tenant_id;

-- Devices: gateways (installed or spare stock), then one hub per (gateway, board), then one lock per unit
insert into devices (id, tenant_id, site_id, kind, name, model, serial, ip, mac, firmware, status, last_ping_at, attrs, source, source_ref, created_at)
select import.stable_uuid('device', g.zoho_id), g.tenant_id, s.id, 'gateway', g.name, coalesce('Flexilock RPi ' || g.hardware_version, 'Flexilock RPi'), g.serial,
       case when g.ip_address ~ '^\d+\.\d+\.\d+\.\d+$' then g.ip_address::inet end, g.mac_eth, g.software_version,
       case g.connectivity_status when 'ONLINE' then 'good' when 'WEAK' then 'watch' when 'OFFLINE' then 'bad' else 'unknown' end::device_status,
       g.last_report_at,
       jsonb_strip_nulls(jsonb_build_object('raspbian', g.raspbian_version, 'connected_controllers', g.connected_controllers, 'expected_boards', g.expected_boards,
         'main_entrance_lock', g.main_entrance_lock, 'main_entrance_name', g.main_entrance_name, 'controller_error', g.controller_error, 'power_source', g.power_source,
         'add_state', g.add_state, 'placement', g.placement, 'mac_wifi', g.mac_wifi)),
       'zoho', g.zoho_id, g.created_at
from legacy.gateways g
left join sites s on s.source_ref = g.facility_zoho_id
where g.tenant_id is not null;

insert into devices (id, tenant_id, site_id, parent_id, kind, name, model, port, status, source, source_ref)
select import.stable_uuid('hub', gw.id::text || '|' || lu.board_address), gw.tenant_id, gw.site_id, gw.id, 'hub', 'Board ' || lu.board_address, 'Flexilock board', lu.board_address, 'unknown', 'zoho', gw.source_ref || '|' || lu.board_address
from (select distinct gateway_zoho_id, board_address from legacy.units where gateway_zoho_id is not null and board_address is not null) lu
join devices gw on gw.source = 'zoho' and gw.source_ref = lu.gateway_zoho_id and gw.kind = 'gateway';

-- Units
insert into units (id, tenant_id, site_id, zone_id, unit_type_id, number, display_name, size_value, size_unit, tier, currency, lock_model, hub_id, hub_port, gateway_id, status, status_detail,
  level, dimensions, notes, commissioned_at, decommissioned_at, source, source_ref, created_at, updated_at)
select coalesce(lu.unit_uuid, import.stable_uuid('unit', lu.zoho_id)), s.tenant_id, s.id, z.id, ut.id,
       coalesce(case when lu.easy_id ~ '-\d+$' then ltrim((regexp_match(lu.easy_id, '-(\d+)$'))[1], '0') end, lu.name) || case when lu.name_rn > 1 then '#' || lu.name_rn else '' end,
       coalesce(lu.easy_id, lu.name),
       coalesce(lu.area_m2_calc, lu.volume_m3_calc, ut.size_value), coalesce(t.settings->>'size_unit', 'm2'), 'normal', s.currency, lu.lock_type,
       hub.id, lu.port_address, gw.id,
       case lu.status
         when 'AVAILABLE' then 'available' when 'CHECKED_OUT' then 'available'
         when 'RESERVED_PENDING' then 'reserved' when 'RESERVED_UNPAID' then 'reserved'
         when 'NOT_AVAILABLE' then case when lu.active and lu.decommission_date is null then 'maintenance' else 'decommissioned' end
         when 'PROBLEM' then 'maintenance'
         else 'occupied' end::unit_status,
       nullif(concat_ws(' · ', lu.status, lu.status_detail), ''),
       lu.level,
       jsonb_strip_nulls(jsonb_build_object('w', lu.width_m, 'h', lu.height_m, 'd', lu.depth_m, 'area_m2', lu.area_m2_calc, 'volume_m3', lu.volume_m3_calc, 'floor', lu.floor,
                                            'mezzanine', lu.mezzanine, 'column', lu.has_column, 'lock_id', lu.lock_id, 'sensor_id', lu.sensor_id, 'ignore_door_alarm', lu.ignore_door_alarm)),
       nullif(concat_ws(E'\n', lu.permanent_note, lu.note, lu.system_note), ''), lu.commission_date, lu.decommission_date, 'zoho', lu.zoho_id, lu.created_at, lu.updated_at
from (select u.*, row_number() over (partition by u.facility_zoho_id, coalesce(case when u.easy_id ~ '-\d+$' then ltrim((regexp_match(u.easy_id, '-(\d+)$'))[1], '0') end, u.name) order by u.zoho_id) as name_rn
      from legacy.units u) lu
join sites s on s.source_ref = lu.facility_zoho_id
join tenants t on t.id = s.tenant_id
join zones z on z.site_id = s.id and z.code = 'A'
left join unit_types ut on ut.site_id = s.id and ut.name = lu.size_label
left join devices gw on gw.source = 'zoho' and gw.source_ref = lu.gateway_zoho_id and gw.kind = 'gateway'
left join devices hub on hub.source = 'zoho' and hub.source_ref = lu.gateway_zoho_id || '|' || lu.board_address and hub.kind = 'hub';

-- Locks: one device per unit with a lock id
insert into devices (id, tenant_id, site_id, parent_id, kind, name, model, port, unit_id, status, attrs, source, source_ref)
select import.stable_uuid('lock', u.id::text), u.tenant_id, u.site_id, u.hub_id, 'lock', 'Lock ' || u.display_name, u.lock_model, u.hub_port, u.id, 'unknown',
       jsonb_strip_nulls(jsonb_build_object('lock_id', u.dimensions->>'lock_id', 'sensor_id', u.dimensions->>'sensor_id')), 'zoho', 'lock:' || u.source_ref
from units u where u.dimensions ? 'lock_id';
update units u set lock_device_id = d.id from devices d where d.kind = 'lock' and d.unit_id = u.id;
