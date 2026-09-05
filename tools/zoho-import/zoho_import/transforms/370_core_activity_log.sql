-- The event firehose and the histories → activity_log. Kind map (Zoho EventType → memo action vocabulary):
--   UNLOCK/WATCHLIST_UNLOCK → lock.unlock · DOOR_ALARM_BREACH → lock.alarm · RECURRING_PAYMENT/PAYMENT_SUCCESS → payment.settled ·
--   PAYMENT_PROBLEM/OUTSTANDING_PAYMENT → payment.failed · RESERVE/NEW_RESERVATION_PAID → subscription.started · CANCEL → subscription.notice_given ·
--   CHECKOUT → subscription.cancelled · SHARE_* → customer.key_shared/… · FACILITY_NOT_REPORTING → device.status_changed · SYSTEM_NOTIFY → pricing.changed …
-- requires: legacy.app_events(zoho_id)

insert into activity_log (tenant_id, ts, actor_kind, actor_id, action, target_kind, target_id, customer_id, subscription_id, unit_id, site_id, device_id, severity, summary, payload, source, source_ref)
select e.tenant_id, e.occurred_at,
       case when e.event_type in ('UNLOCK','WATCHLIST_UNLOCK','RESERVE','CANCEL','SHARE_INVITE','SHARE_ACCEPT','SHARE_ACCEPTED','SHARE_REJECTED','SHARE_REVOKED','DELETE_ACCOUNT','ITEM_MANAGE','PAYMENT_DETAILS_CHANGED') and cu.id is not null then 'customer'
            when e.event_type in ('SUPPORT','TASK','MANUAL_VERIFICATION','SUSPEND','UNSUSPEND','REACTIVATE','DELETE') then 'operator' else 'system' end::author_kind,
       null,
       case e.event_type
         when 'UNLOCK' then 'lock.unlock' when 'WATCHLIST_UNLOCK' then 'lock.unlock' when 'WATCHLIST_ADD' then 'customer.watchlisted'
         when 'DOOR_ALARM_BREACH' then 'lock.alarm' when 'DOOR_ALARM_OK' then 'lock.alarm_cleared'
         when 'RECURRING_PAYMENT' then case when e.success = false then 'payment.failed' else 'payment.settled' end
         when 'PAYMENT_SUCCESS' then 'payment.settled' when 'PAYMENT_PROBLEM' then 'payment.failed' when 'OUTSTANDING_PAYMENT' then 'invoice.overdue'
         when 'PAYMENT_DETAILS_CHANGED' then 'customer.payment_method_changed' when 'REFUND PAYMENT' then 'payment.refunded' when 'CUSTOMER_INVOICE_REQUEST' then 'invoice.requested'
         when 'RESERVE' then 'subscription.reserved' when 'NEW_RESERVATION_PAID' then 'subscription.started' when 'CANCEL' then 'subscription.notice_given'
         when 'CHECKOUT' then 'subscription.cancelled' when 'DELETE' then 'subscription.deleted' when 'REACTIVATE' then 'subscription.reactivated'
         when 'SUSPEND' then 'subscription.suspended' when 'UNSUSPEND' then 'subscription.unsuspended' when 'ITEM_MANAGE' then 'subscription.items_changed'
         when 'SHARE_INVITE' then 'customer.key_share_invited' when 'SHARE_ACCEPT' then 'customer.key_share_accepted' when 'SHARE_ACCEPTED' then 'customer.key_share_accepted'
         when 'SHARE_REJECTED' then 'customer.key_share_rejected' when 'SHARE_REVOKED' then 'customer.key_share_revoked'
         when 'FACILITY_NOT_REPORTING' then 'device.status_changed' when 'SYSTEM_NOTIFY' then case when e.heading ilike 'Price for unit type%' then 'pricing.changed' else 'system.notify' end
         when 'SUPPORT' then 'ticket.created' when 'TASK' then 'task.created' when 'MANUAL_VERIFICATION' then 'customer.kyc_manual' when 'DELETE_ACCOUNT' then 'customer.deleted'
         else 'legacy.' || lower(coalesce(e.event_type, 'unknown')) end,
       case when s.id is not null then 'subscription' when un.id is not null then 'unit' when cu.id is not null then 'customer' when st.id is not null then 'site' end,
       coalesce(s.id, un.id, cu.id, st.id),
       coalesce(s.customer_id, cu.id), s.id, coalesce(un.id, s.unit_id), coalesce(st.id, un.site_id, s.site_id), null,
       case when e.event_type in ('DOOR_ALARM_BREACH','FACILITY_NOT_REPORTING') then 'bad' when e.event_type in ('PAYMENT_PROBLEM','OUTSTANDING_PAYMENT') or e.success = false then 'watch' end,
       coalesce(e.heading, e.event_type),
       jsonb_strip_nulls(jsonb_build_object('event_type', e.event_type, 'success', e.success, 'description', e.description, 'details', e.details, 'details_raw', e.details_raw,
         'lock_id', e.lock_id, 'unit_easy_id', e.unit_easy_id, 'payment_amount_minor', import.minor(e.payment_amount), 'payment_currency', e.payment_currency, 'payment_attempt', e.payment_attempt,
         'share_recipient_email', e.share_recipient_email, 'share_recipient_name', e.share_recipient_name, 'share_start', e.share_start, 'share_end', e.share_end, 'first_unlock', e.first_unlock)),
       'zoho', e.zoho_id
from legacy.app_events e
left join subscriptions s on s.id = e.reservation_uuid
left join units un on un.id = e.unit_uuid
left join customers cu on cu.id = e.user_uuid
left join sites st on st.id = e.facility_uuid;

-- backend notifications (Communications) are notification events
insert into activity_log (tenant_id, ts, actor_kind, action, target_kind, target_id, customer_id, subscription_id, unit_id, site_id, summary, payload, source, source_ref)
select c.tenant_id, c.created_at, 'system',
       'notification.' || lower(regexp_replace(coalesce(c.event_name, 'sent'), '[^A-Za-z]+', '_', 'g')),
       case when s.id is not null then 'subscription' when cu.id is not null then 'customer' end, coalesce(s.id, cu.id), coalesce(s.customer_id, cu.id), s.id, s.unit_id, s.site_id,
       c.event_name || case when c.email_sent then ' · email' else '' end || case when c.sms_sent then ' · sms' else '' end,
       jsonb_strip_nulls(jsonb_build_object('email_sent', c.email_sent, 'sms_sent', c.sms_sent, 'payment_attempt', c.payment_attempt_number, 'customer_rating', c.customer_rating,
         'customer_feedback', c.customer_feedback, 'occupancy_at_event', c.occupancy_at_event)),
       'zoho', c.zoho_id
from legacy.communications c
left join subscriptions s on s.source_ref = c.reservation_zoho_id
left join legacy.contacts lc on lc.zoho_id = c.contact_zoho_id
left join customers cu on cu.tenant_id = c.tenant_id and cu.id = coalesce(lc.appuser_uuid, import.stable_uuid('customer', c.contact_zoho_id))
where c.created_at is not null and c.tenant_id is not null;

-- unit status timeline (reconstructed timestamps flagged in payload)
insert into activity_log (tenant_id, ts, actor_kind, action, target_kind, target_id, unit_id, site_id, summary, payload, source, source_ref)
select h.tenant_id, h.entered_at, 'system', 'unit.status_changed', 'unit', u.id, u.id, u.site_id, coalesce(h.from_status, '?') || ' → ' || coalesce(h.to_status, '?'),
       jsonb_build_object('from', h.from_status, 'to', h.to_status, 'duration_days', h.duration_days, 'timestamp_reconstructed', h.reconstructed), 'zoho', h.zoho_id
from legacy.unit_status_history h join units u on u.source_ref = h.unit_zoho_id
where h.entered_at is not null;

insert into activity_log (tenant_id, ts, actor_kind, action, target_kind, target_id, customer_id, subscription_id, unit_id, site_id, summary, payload, source, source_ref)
select h.tenant_id, h.changed_at, 'system', 'subscription.status_changed', 'subscription', s.id, s.customer_id, s.id, s.unit_id, s.site_id, coalesce(h.from_status, '?') || ' → ' || coalesce(h.to_status, '?'),
       jsonb_build_object('from', h.from_status, 'to', h.to_status, 'payment_status', h.payment_status, 'duration_days', h.duration_days), 'zoho', h.zoho_id
from legacy.reservation_status_history h join subscriptions s on s.source_ref = h.reservation_zoho_id
where h.changed_at is not null;

-- The pricing engine's only historical record: SYSTEM_NOTIFY "Price for unit type 5 kubikk changed to 1354.50 NOK, occupancy 84.21%→89.47%, multiplier 1.05"
insert into price_history (tenant_id, site_id, unit_type_id, kind, new_price_minor, currency, occupancy_from_pct, occupancy_to_pct, multiplier, reason, changed_at, source, source_ref)
select e.tenant_id, st.id, ut.id, 'dynamic',
       import.zoho_minor(m[2]), upper(m[3]), import.zoho_num(m[4]), import.zoho_num(m[5]), import.zoho_num(m[6]), e.heading, e.occurred_at, 'zoho', e.zoho_id
from legacy.app_events e
cross join lateral regexp_match(e.heading, 'Price for unit type (.+?) changed to ([0-9.,]+) ?([A-Z]{3}).*?occupancy ([0-9.]+)%\s*(?:→|->|to)\s*([0-9.]+)%.*?multiplier ([0-9.]+)') as m
left join sites st on st.id = e.facility_uuid
left join unit_types ut on ut.site_id = st.id and ut.name = m[1]
where e.event_type = 'SYSTEM_NOTIFY' and e.heading ilike 'Price for unit type%';
