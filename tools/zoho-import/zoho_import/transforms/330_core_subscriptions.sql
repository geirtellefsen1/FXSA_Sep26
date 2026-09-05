-- legacy.reservations → subscriptions (anything that was ever paid/active/ended/blocked) and reservations (UNPAID/PENDING holds).
-- requires: legacy.reservations(zoho_id)

create temp table _res as
select r.*,
       coalesce(r.user_uuid, lc.appuser_uuid, case when r.contact_zoho_id is not null then import.stable_uuid('customer', r.contact_zoho_id) end) as customer_uuid,
       u.id as unit_core_id, u.site_id as site_core_id, u.tenant_id as unit_tenant_id
from legacy.reservations r
left join legacy.contacts lc on lc.zoho_id = r.contact_zoho_id
left join units u on u.source = 'zoho' and (u.id = r.unit_uuid or u.source_ref = (select lu.zoho_id from legacy.units lu where lu.unit_uuid = r.unit_uuid limit 1));

insert into subscriptions (id, tenant_id, customer_id, unit_id, site_id, plan_size_value, plan_size_unit, price_minor, list_price_minor, discount_pct, discount_code, currency, billing_period, billing_day,
  started_at, ends_at, next_bill_at, status, notice_at, closed_at, closed_reason, outstanding_minor, booking_channel, first_access_at, legacy, source, source_ref, created_at, updated_at)
select coalesce(r.reservation_uuid, import.stable_uuid('subscription', r.zoho_id)), r.tenant_id, cu.id, r.unit_core_id, r.site_core_id,
       un.size_value, un.size_unit,
       import.minor(coalesce(r.discounted_price, r.price, 0)), import.minor(r.price),
       case when r.price > 0 and r.discounted_price is not null and r.discounted_price < r.price then round(100 * (1 - r.discounted_price / r.price), 2) end,
       r.discount_code, r.currency,
       case r.subscription_type when 'YEARLY' then 'yearly' when 'WEEKLY' then 'weekly' when 'DAILY' then 'daily' else 'monthly' end,
       extract(day from coalesce(r.start_date, r.backend_created_at::date, r.created_at::date))::smallint,
       coalesce(r.start_date, r.backend_created_at::date, r.created_at::date),
       case when r.payment_status in ('CHECKED_OUT','DEMO') or r.order_status = 'Deleted' then coalesce(r.last_occupation_date, r.end_date, r.updated_at::date) else r.end_date end,
       case when r.payment_status in ('PAID','PROBLEM','CANCELLING','PROBLEM_CANCELLING','CANCEL_NEXT_PERIOD') then r.end_date end,
       case when r.order_status = 'Suspended' then 'suspended'
            when r.payment_status = 'PAID' then 'active'
            when r.payment_status = 'PROBLEM' then 'arrears'
            when r.payment_status in ('CANCELLING','CANCEL_NEXT_PERIOD') then 'notice_given'
            when r.payment_status = 'PROBLEM_CANCELLING' then 'arrears'
            when r.payment_status = 'MAINTENANCE' then 'paused'
            else 'closed' end::subscription_status,
       case when r.payment_status in ('CANCELLING','PROBLEM_CANCELLING','CANCEL_NEXT_PERIOD') then coalesce(r.cancel_sent_at::date, r.updated_at::date) end,
       case when r.payment_status in ('CHECKED_OUT','DEMO') then coalesce(r.last_occupation_date, r.end_date, r.updated_at::date) end,
       case when r.payment_status = 'CHECKED_OUT' then 'checked_out' when r.payment_status = 'DEMO' then 'demo' end,
       import.minor(coalesce(r.outstanding_amount, 0)), import.booking_channel(r.booking_platform_raw), r.first_unlock_at,
       jsonb_strip_nulls(jsonb_build_object('zoho_order_status', r.order_status, 'zoho_payment_status', r.payment_status, 'order_number', r.order_number, 'order_code', r.order_code,
         'original_price', r.original_price, 'occupancy_modifier', r.occupancy_modifier, 'seasonal_modifier', r.seasonal_modifier, 'remaining_periods', r.remaining_periods,
         'last_occupation_date', r.last_occupation_date, 'booking_platform', r.booking_platform_raw, 'card_last4', r.card_last4, 'card_expiry', r.card_expiry,
         'first_unlock', r.first_unlock, 'welcome_sent_at', r.welcome_sent_at, 'checkout_sent_at', r.checkout_sent_at, 'cancel_sent_at', r.cancel_sent_at,
         'first_unlock_sent_at', r.first_unlock_sent_at, 'card_expiry_sent_at', r.card_expiry_sent_at, 'unit_name', r.unit_name, 'unit_size', r.unit_size, 'email', r.email,
         'problem_cancelling', case when r.payment_status = 'PROBLEM_CANCELLING' then true end)),
       'zoho', r.zoho_id, coalesce(r.backend_created_at, r.created_at), r.updated_at
from _res r
join customers cu on cu.id = r.customer_uuid and cu.tenant_id = r.tenant_id
left join units un on un.id = r.unit_core_id
where r.payment_status not in ('UNPAID','PENDING') and r.unit_core_id is not null;

insert into reservations (id, tenant_id, customer_id, unit_id, site_id, status, price_minor, currency, booking_channel, source, source_ref, created_at, updated_at)
select coalesce(r.reservation_uuid, import.stable_uuid('reservation', r.zoho_id)), r.tenant_id, cu.id, r.unit_core_id, r.site_core_id,
       case when r.payment_status = 'PENDING' then 'pending' else 'abandoned' end,
       import.minor(coalesce(r.discounted_price, r.price)), r.currency, import.booking_channel(r.booking_platform_raw), 'zoho', r.zoho_id, coalesce(r.backend_created_at, r.created_at), r.updated_at
from _res r
left join customers cu on cu.id = r.customer_uuid and cu.tenant_id = r.tenant_id
where r.payment_status in ('UNPAID','PENDING') and r.unit_core_id is not null;

-- link stored instruments
update subscriptions s set payment_instrument_id = pi.id
from legacy.payment_details pd
join payment_instruments pi on pi.source_ref = pd.zoho_id
where s.source_ref = pd.reservation_zoho_id and s.payment_instrument_id is null;

-- unit → current subscription: the unit's own reservationId first, else the latest live subscription on the unit
update units u set current_subscription_id = s.id
from legacy.units lu join subscriptions s on s.id = lu.reservation_uuid
where u.source_ref = lu.zoho_id;
update units u set current_subscription_id = x.id
from (select distinct on (unit_id) unit_id, id from subscriptions where status in ('active','arrears','notice_given','paused','suspended') order by unit_id, started_at desc) x
where x.unit_id = u.id and u.current_subscription_id is null;
drop table _res;
