-- legacy.payments (non-test) → payments. Provider/status vocab normalised; raw kept.
-- requires: legacy.payments(zoho_id)
insert into payments (id, tenant_id, subscription_id, customer_id, method, provider, provider_ref, provider_message, amount_minor, refunded_minor, currency, status, card_last4, received_at, settled_at,
  is_test, raw, source, source_ref, created_at)
select import.stable_uuid('payment', p.zoho_id), p.tenant_id, s.id, coalesce(s.customer_id, cu.id),
       case when p.payment_type_display ilike '%credit_note%' then 'credit_note'
            when lower(p.provider) = 'stripe' then 'stripe-card'
            when lower(p.provider) = 'paystack' then case when p.payment_type_display ilike '%eft%' then 'paystack-eft' else 'paystack-card' end
            when lower(p.provider) = 'pog' then 'invoice'
            when lower(p.provider) = 'xero' then case when p.payment_type_display ilike '%eft%' then 'manual-eft' else 'invoice' end
            else 'other' end,
       case lower(p.provider) when 'pog' then 'poweroffice' else lower(p.provider) end,
       coalesce(p.provider_payment_id, p.provider_charge_id), p.payment_type_display,
       import.minor(case when lower(p.status) in ('succeeded','approved','captured','paid','refunded') then coalesce(nullif(p.total_captured,0), p.total_authorized, 0)
                         else coalesce(nullif(p.total_declined,0), nullif(p.total_authorized,0), nullif(p.total_captured,0), 0) end),
       import.minor(coalesce(p.refund_amount, p.total_refunded, 0)), p.currency,
       case lower(p.status)
         when 'succeeded' then 'settled' when 'approved' then 'settled' when 'captured' then 'settled' when 'paid' then 'settled'
         when 'refunded' then 'refunded' when 'requires_capture' then 'authorised'
         when 'requires_action' then 'pending' when 'requires_confirmation' then 'pending' when 'processing' then 'pending' when 'pending' then 'pending'
         else 'failed' end::payment_status,
       p.card_last4, coalesce(p.transacted_at, p.created_at), case when lower(p.status) in ('succeeded','approved','captured','paid') then coalesce(p.transacted_at, p.created_at) end,
       false, jsonb_build_object('zoho_status', p.status, 'authorized', p.total_authorized, 'captured', p.total_captured, 'declined', p.total_declined, 'refunded', p.total_refunded,
                                 'refund_reason', p.refund_reason, 'merchant', p.merchant, 'url', p.provider_url, 'payment_name', p.payment_name),
       'zoho', p.zoho_id, p.created_at
from legacy.payments p
left join subscriptions s on s.source_ref = p.reservation_zoho_id
left join legacy.contacts lc on lc.zoho_id = p.contact_zoho_id
left join customers cu on cu.tenant_id = p.tenant_id and cu.id = coalesce(lc.appuser_uuid, import.stable_uuid('customer', p.contact_zoho_id))
where not p.is_test;
