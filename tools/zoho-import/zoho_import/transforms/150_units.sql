-- Units (Zoho Products "Bods / Units"). Market via facility (100% resolvable).
-- requires: zoho_raw.units(record_id, bod_unit_name, facility__id, status)
-- optional: zoho_raw.units(storageunitid, easyid, additionalstatusdetails, reservationid, size, level, width_m, height_m, depth_m, size_m2_m3_calculated, lock_type, lockid, sensorid, gateway__id, board_address, port_address, gateway_name, mezzanine, floor, column, ignore_door_alarm, commission_date, decommission_date, permanent_note, note, note_system, images_available, bod_unit_active, quantity_in_demand, created_time, modified_time)
truncate legacy.units cascade;
insert into legacy.units (zoho_id, tenant_id, market, market_source, unit_uuid, easy_id, name, facility_zoho_id, status, status_detail, reservation_uuid, size_label, level,
  width_m, height_m, depth_m, area_m2_calc, volume_m3_calc, lock_type, lock_id, sensor_id, gateway_zoho_id, board_address, port_address, gateway_name, mezzanine, floor, has_column,
  ignore_door_alarm, commission_date, decommission_date, permanent_note, note, system_note, images_available, active, qty_in_demand, extra, created_at, updated_at)
select import.zoho_prefix(u.record_id), f.tenant_id, f.market, 'facility', import.zoho_uuid(u.storageunitid), import.nz(u.easyid), import.nz(u.bod_unit_name), f.zoho_id,
       upper(import.nz(u.status)), import.nz(u.additionalstatusdetails), import.zoho_uuid(u.reservationid), import.nz(u.size), import.zoho_int(u.level),
       import.zoho_num(u.width_m), import.zoho_num(u.height_m), import.zoho_num(u.depth_m),
       case when f.market = 'SA' then import.zoho_num(u.size_m2_m3_calculated) end,
       case when f.market <> 'SA' then import.zoho_num(u.size_m2_m3_calculated) end,
       import.nz(u.lock_type), import.nz(u.lockid), import.nz(u.sensorid), import.zoho_prefix(u.gateway__id), import.zoho_int(u.board_address), import.zoho_int(u.port_address),
       import.nz(u.gateway_name), import.zoho_bool(u.mezzanine), import.nz(u.floor), import.zoho_bool(u."column"), import.zoho_bool(u.ignore_door_alarm),
       import.zoho_date(u.commission_date), import.zoho_date(u.decommission_date), import.nz(u.permanent_note), import.nz(u.note), import.nz(u.note_system),
       import.zoho_bool(u.images_available), coalesce(import.zoho_bool(u.bod_unit_active), true), import.zoho_int(u.quantity_in_demand),
       to_jsonb(u) - '_src_file', import.zoho_ts(u.created_time), import.zoho_ts(u.modified_time)
from zoho_raw.units u
join legacy.facilities f on f.zoho_id = import.zoho_prefix(u.facility__id)
where import.nz(u.record_id) is not null;
