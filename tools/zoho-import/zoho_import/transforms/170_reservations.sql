-- Reservations (Zoho SalesOrders) — all rows, one each. Market via facility (100%).
-- requires: zoho_raw.reservations(record_id, facility__id, status, payment_status)
-- optional: zoho_raw.reservations(subject, order_number, reservation_order_number, reservationid, user_id, contact_appuser__id, app_user__id, email, facility_id, storage_unit, storage_unit_name, unit_name, unit_size, size, subscription_type, order_currency_code, currency_code, price, discounted_price, original_price, discount_code, occupancy_modifier, seasonal_modifier, occupancy_modifier_applied, seasonal_modifier_applied, outstanding_amount, remainingperiods, order_start_date, order_end_date, lastoccupationdate, backend_created_time, booking_platform, credit_card, credit_card_expiry, credit_card_expiry_status, first_unlock, first_unlock_date, welcomecommsent, welcomecommsentdate, checkoutcommsent, checkoutcommsentdate, cancelcommsent, cancelcommsentdate, firstunlockcommsent, firstunlockcommsentdate, creditcardexpcommsent, creditcardexpcommsentdate, contacted_for_feedback, trigger_automation, description, organisation, sales_order_owner__id, owner__id, created_time, modified_time)
-- optional: zoho_raw.ordered_items(record_id, parent__id, product_name__id, product__id, quantity, list_price)
-- optional: zoho_raw.payment_details(record_id, reservation__id, orderid, orderid_sequence, payment_type, subscriptionid, reference, credit_cards, credit_card_expiry, subscription_type, status, outstanding_amount, currency, lastpaymentdatetime, lastpaymenttransactionid, receipt_url, additional_status_message, created_time, modified_time)
-- optional: zoho_raw.status_history_gads(record_id, subject__id, status, moved_to, payment_status, facility_id, email, duration_days, duration, created_time, modified_time)
truncate legacy.reservations, legacy.payment_details, legacy.reservation_status_history cascade;
insert into legacy.reservations (zoho_id, tenant_id, market, market_source, reservation_uuid, order_number, order_code, user_uuid, contact_zoho_id, appuser_legacy_zoho_id, email,
  facility_uuid, facility_zoho_id, unit_uuid, unit_name, unit_size, order_status, payment_status, subscription_type, currency, price, discounted_price, original_price, discount_code,
  occupancy_modifier, seasonal_modifier, occupancy_modifier_applied, seasonal_modifier_applied, outstanding_amount, remaining_periods, start_date, end_date, last_occupation_date,
  backend_created_at, booking_platform_raw, card_last4, card_expiry, card_expiry_status, first_unlock, first_unlock_at, welcome_sent_at, checkout_sent_at, cancel_sent_at,
  first_unlock_sent_at, card_expiry_sent_at, contacted_for_feedback, trigger_automation, description, organisation_raw, owner_zoho_id, extra, created_at, updated_at)
select import.zoho_prefix(r.record_id), f.tenant_id, f.market, 'facility', import.zoho_uuid(coalesce(r.reservationid, r.subject)), import.nz(r.order_number), import.nz(r.reservation_order_number),
       import.zoho_uuid(r.user_id), import.zoho_prefix(r.contact_appuser__id), import.zoho_prefix(r.app_user__id), lower(import.nz(r.email)),
       import.zoho_uuid(r.facility_id), f.zoho_id, import.zoho_uuid(r.storage_unit), coalesce(import.nz(r.storage_unit_name), import.nz(r.unit_name)), coalesce(import.nz(r.unit_size), import.nz(r.size)),
       import.nz(r.status), upper(coalesce(import.nz(r.payment_status), 'UNPAID')), upper(import.nz(r.subscription_type)),
       coalesce(upper(import.nz(r.order_currency_code)), upper(import.nz(r.currency_code)), f.currency),
       import.zoho_num(r.price), import.zoho_num(r.discounted_price), import.zoho_num(r.original_price), import.nz(r.discount_code),
       import.zoho_num(r.occupancy_modifier), import.zoho_num(r.seasonal_modifier), import.zoho_bool(r.occupancy_modifier_applied), import.zoho_bool(r.seasonal_modifier_applied),
       import.zoho_num(r.outstanding_amount), import.zoho_int(r.remainingperiods), import.zoho_date(r.order_start_date), import.zoho_date(r.order_end_date), import.zoho_date(r.lastoccupationdate),
       import.zoho_ts(r.backend_created_time), import.nz(r.booking_platform), right(regexp_replace(coalesce(r.credit_card,''), '[^0-9]', '', 'g'), 4), import.nz(r.credit_card_expiry), import.nz(r.credit_card_expiry_status),
       import.zoho_bool(r.first_unlock), import.zoho_ts(r.first_unlock_date), import.zoho_ts(r.welcomecommsentdate), import.zoho_ts(r.checkoutcommsentdate), import.zoho_ts(r.cancelcommsentdate),
       import.zoho_ts(r.firstunlockcommsentdate), import.zoho_ts(r.creditcardexpcommsentdate), import.zoho_bool(r.contacted_for_feedback), import.zoho_bool(r.trigger_automation),
       import.nz(r.description), import.nz(r.organisation), import.zoho_prefix(coalesce(r.sales_order_owner__id, r.owner__id)), to_jsonb(r) - '_src_file',
       import.zoho_ts(r.created_time), import.zoho_ts(r.modified_time)
from zoho_raw.reservations r
join legacy.facilities f on f.zoho_id = import.zoho_prefix(r.facility__id)
where import.nz(r.record_id) is not null;

-- Ordered Items is 1:1 with reservations; only used to backfill the unit link when Storage Unit uuid is missing
update legacy.reservations lr
set unit_uuid = u.unit_uuid
from zoho_raw.ordered_items oi
join legacy.units u on u.zoho_id = import.zoho_prefix(coalesce(oi.product_name__id, oi.product__id))
where lr.zoho_id = import.zoho_prefix(oi.parent__id) and lr.unit_uuid is null;

insert into legacy.payment_details (zoho_id, tenant_id, market, market_source, reservation_zoho_id, order_code, order_sequence, payment_type, subscription_id_provider, reference,
  card_last4, card_expiry, subscription_type, status, outstanding_amount, currency, last_payment_at, last_payment_txn_id, receipt_url, status_message, extra, created_at, updated_at)
select import.zoho_prefix(d.record_id), lr.tenant_id, lr.market, 'reservation', lr.zoho_id, import.nz(d.orderid), import.zoho_int(d.orderid_sequence), import.nz(d.payment_type),
       import.nz(d.subscriptionid), import.nz(d.reference), right(regexp_replace(coalesce(d.credit_cards,''), '[^0-9]', '', 'g'), 4), import.nz(d.credit_card_expiry),
       upper(import.nz(d.subscription_type)), upper(import.nz(d.status)), import.zoho_num(d.outstanding_amount), coalesce(upper(import.nz(d.currency)), lr.currency),
       import.zoho_ts(d.lastpaymentdatetime), import.nz(d.lastpaymenttransactionid), import.nz(d.receipt_url), import.nz(d.additional_status_message), to_jsonb(d) - '_src_file',
       import.zoho_ts(d.created_time), import.zoho_ts(d.modified_time)
from zoho_raw.payment_details d
left join legacy.reservations lr on lr.zoho_id = import.zoho_prefix(d.reservation__id)
where import.nz(d.record_id) is not null;

insert into legacy.reservation_status_history (zoho_id, tenant_id, reservation_zoho_id, from_status, to_status, payment_status, facility_uuid, email, duration_days, duration_text, seq, changed_at)
select import.zoho_prefix(h.record_id), lr.tenant_id, lr.zoho_id, import.nz(h.status), import.nz(h.moved_to), import.nz(h.payment_status), import.zoho_uuid(h.facility_id), lower(import.nz(h.email)),
       import.zoho_int(h.duration_days), import.nz(h.duration),
       row_number() over (partition by lr.zoho_id order by import.zoho_ts(coalesce(h.modified_time, h.created_time)), h.record_id),
       import.zoho_ts(coalesce(h.modified_time, h.created_time))
from zoho_raw.status_history_gads h
join legacy.reservations lr on lr.zoho_id = import.zoho_prefix(h.subject__id)
where import.nz(h.record_id) is not null;
