-- Payments (attempts). Market from currency, else reservation. Test rows kept in legacy, flagged.
-- requires: zoho_raw.payments(record_id, status)
-- optional: zoho_raw.payments(payment_name, reservation__id, payment_details__id, contactappuser__id, contact_appuser__id, payment_provider, paymentid, paymenttype_id, reference, payment_url, url, paymenttype_displayname, credit_card, currency_code, currency, total_authorized, total_captured, total_declined, total_refunded, available_capture, refund_amount, reason_for_refund, merchantnumber, test, transaction_datetime, created_time, modified_time)
truncate legacy.payments cascade;
insert into legacy.payments (zoho_id, tenant_id, market, market_source, payment_name, reservation_zoho_id, payment_details_zoho_id, contact_zoho_id, provider, provider_payment_id,
  provider_charge_id, provider_url, status, payment_type_display, card_last4, currency, total_authorized, total_captured, total_declined, total_refunded, available_capture,
  refund_amount, refund_reason, merchant, is_test, transacted_at, extra, created_at, updated_at)
select import.zoho_prefix(p.record_id), import.tenant_for_market(m.market), m.market, m.src, import.nz(p.payment_name), lr.zoho_id, import.zoho_prefix(p.payment_details__id),
       import.zoho_prefix(coalesce(p.contactappuser__id, p.contact_appuser__id)), import.nz(p.payment_provider), import.nz(p.paymentid), coalesce(import.nz(p.paymenttype_id), import.nz(p.reference)),
       coalesce(import.nz(p.payment_url), import.nz(p.url)), lower(import.nz(p.status)), import.nz(p.paymenttype_displayname), right(regexp_replace(coalesce(p.credit_card,''), '[^0-9]', '', 'g'), 4),
       coalesce(upper(import.nz(p.currency_code)), upper(import.nz(p.currency)), lr.currency),
       import.zoho_num(p.total_authorized), import.zoho_num(p.total_captured), import.zoho_num(p.total_declined), import.zoho_num(p.total_refunded), import.zoho_num(p.available_capture),
       import.zoho_num(p.refund_amount), import.nz(p.reason_for_refund), import.nz(p.merchantnumber), coalesce(import.zoho_bool(p.test), false),
       import.zoho_ts(p.transaction_datetime), to_jsonb(p) - '_src_file', import.zoho_ts(p.created_time), import.zoho_ts(p.modified_time)
from zoho_raw.payments p
left join legacy.reservations lr on lr.zoho_id = import.zoho_prefix(p.reservation__id)
cross join lateral (
  select coalesce(import.market_from_currency(coalesce(p.currency_code, p.currency)), lr.market, 'NO'::legacy.market_code) as market,
         case when import.market_from_currency(coalesce(p.currency_code, p.currency)) is not null then 'currency' when lr.market is not null then 'reservation' else 'default' end as src) m
where import.nz(p.record_id) is not null;
