-- The event firehose: 2.09M rows across 21 chunks. Details parsed defensively (JSON | "k":"v" lines | prose → raw).
-- Market via facility uuid, else reservation, else unit, else contact.
-- requires: zoho_raw.app_events(record_id, eventtype, datecreated)
-- optional: zoho_raw.app_events(appeventid, success, heading, description, details, userid, reservationid, storageunitid, lockid, facilityid, contact_appuser__id, reservation__id, storage_unit__id, facility__id, payment_amount, payment_currency, payment_attempt_number, storage_unit_easyid, first_unlock, share_recipient_email, share_recipient_name, share_start, share_end, created_time)
-- optional: zoho_raw.app_events_x_gateways(record_id, app_event__id, affected_gateways__id, number_of_locks, created_time)
truncate legacy.app_events, legacy.app_event_gateways;
insert into legacy.app_events (zoho_id, tenant_id, market, market_source, event_uuid, event_type, success, heading, description, details, details_raw, occurred_at, user_uuid, reservation_uuid,
  unit_uuid, facility_uuid, lock_id, contact_zoho_id, reservation_zoho_id, unit_zoho_id, facility_zoho_id, payment_amount, payment_currency, payment_attempt, unit_easy_id,
  share_recipient_email, share_recipient_name, share_start, share_end, first_unlock, created_at)
select import.zoho_prefix(e.record_id), coalesce(f.tenant_id, lr.tenant_id, lu.tenant_id, lc.tenant_id, import.tenant_for_market('NO')),
       coalesce(f.market, lr.market, lu.market, lc.market, 'NO'), case when f.zoho_id is not null then 'facility' when lr.zoho_id is not null then 'reservation' when lu.zoho_id is not null then 'unit' when lc.zoho_id is not null then 'contact' else 'default' end,
       import.zoho_uuid(e.appeventid), upper(import.nz(e.eventtype)),
       case lower(import.nz(e.success)) when 'succeeded' then true when 'true' then true when 'failed' then false when 'false' then false end,
       import.nz(e.heading), import.nz(e.description), import.parse_details(e.details), case when import.parse_details(e.details) is null then import.nz(e.details) end,
       coalesce(import.zoho_ts(e.datecreated), import.zoho_ts(e.created_time)),
       import.zoho_uuid(e.userid), import.zoho_uuid(e.reservationid), import.zoho_uuid(e.storageunitid), import.zoho_uuid(e.facilityid), import.nz(e.lockid),
       import.zoho_prefix(e.contact_appuser__id), import.zoho_prefix(e.reservation__id), import.zoho_prefix(e.storage_unit__id), import.zoho_prefix(e.facility__id),
       import.zoho_num(e.payment_amount), upper(import.nz(e.payment_currency)), import.zoho_int(e.payment_attempt_number), import.nz(e.storage_unit_easyid),
       lower(import.nz(e.share_recipient_email)), import.nz(e.share_recipient_name), import.utc_ts(e.share_start), import.utc_ts(e.share_end), import.zoho_bool(e.first_unlock), import.zoho_ts(e.created_time)
from zoho_raw.app_events e
left join legacy.facilities f on f.facility_uuid = import.zoho_uuid(e.facilityid) or (import.zoho_uuid(e.facilityid) is null and f.zoho_id = import.zoho_prefix(e.facility__id))
left join legacy.reservations lr on f.zoho_id is null and (lr.reservation_uuid = import.zoho_uuid(e.reservationid) or lr.zoho_id = import.zoho_prefix(e.reservation__id))
left join legacy.units lu on f.zoho_id is null and lr.zoho_id is null and (lu.unit_uuid = import.zoho_uuid(e.storageunitid) or lu.zoho_id = import.zoho_prefix(e.storage_unit__id))
left join legacy.contacts lc on f.zoho_id is null and lr.zoho_id is null and lu.zoho_id is null and (lc.appuser_uuid = import.zoho_uuid(e.userid) or lc.zoho_id = import.zoho_prefix(e.contact_appuser__id))
where import.nz(e.record_id) is not null and coalesce(import.zoho_ts(e.datecreated), import.zoho_ts(e.created_time)) is not null;

insert into legacy.app_event_gateways (zoho_id, tenant_id, app_event_zoho_id, gateway_zoho_id, number_of_locks, created_at)
select import.zoho_prefix(x.record_id), g.tenant_id, import.zoho_prefix(x.app_event__id), g.zoho_id, import.zoho_int(x.number_of_locks), import.zoho_ts(x.created_time)
from zoho_raw.app_events_x_gateways x
join legacy.gateways g on g.zoho_id = import.zoho_prefix(x.affected_gateways__id)
where import.nz(x.record_id) is not null;
