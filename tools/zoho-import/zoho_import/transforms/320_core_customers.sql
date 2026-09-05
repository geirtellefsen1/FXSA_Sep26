-- legacy.contacts (everyone except SalesIQ web-visitor stubs) → customers. Deterministic account numbers per tenant.
-- Orphan placeholders for reservations whose app account was deleted (User ID with no contact row).
-- requires: legacy.contacts(zoho_id)
with src as (
  select c.*, t.settings->>'customer_id_prefix' as prefix,
         row_number() over (partition by c.tenant_id order by coalesce(c.app_created_at, c.created_at), c.zoho_id) as rn
  from legacy.contacts c join tenants t on t.id = c.tenant_id
  where c.population <> 'web_visitor'
)
insert into customers (id, tenant_id, account_number, kind, first_name, last_name, full_name, email, phone, address, country, preferred_language, kyc_status, kyc_provider, kyc_verified_at,
  accounting_ref, flags, marketing_opt_out, app_user, status, customer_since, source, source_ref, created_at, updated_at)
select coalesce(s.appuser_uuid, import.stable_uuid('customer', s.zoho_id)), s.tenant_id, coalesce(s.prefix, 'C') || '-' || (10000 + s.rn), 'individual',
       s.first_name, s.last_name, coalesce(s.full_name, s.last_name, s.email, '?'), s.email, s.phone_e164,
       jsonb_strip_nulls(jsonb_build_object('street', s.street, 'city', s.city, 'postal_code', s.postal_code, 'country', s.country_raw)), s.country,
       case s.preferred_language when 'NORWEGIAN' then 'nb' when 'ENGLISH' then 'en' when 'FINNISH' then 'fi' when 'SWEDISH' then 'sv' end,
       case s.credit_check_status when 'APPROVED' then 'verified' when 'IDENTITY_NOT_VERIFIED' then 'pending' when 'DECLINED' then 'declined' else 'unknown' end::kyc_status,
       lower(s.verified_with[1]), null, s.financial_tool_url,
       jsonb_strip_nulls(jsonb_build_object('app_disabled', case when s.app_enabled = false then true end, 'partner_contact', case when s.is_partner_contact then true end,
                                            'email_verified', s.email_verified, 'phone_verified', s.phone_verified, 'legacy_population', s.population)),
       s.email_opt_out, s.is_app_user, 'active', coalesce(s.app_created_at, s.created_at)::date, 'zoho', s.zoho_id, s.created_at, s.updated_at
from src s;

-- deduplicate emails inside a tenant (Zoho enforces org-wide uniqueness, but merged NO/SA rows can still collide after market derivation)
update customers c set email = null, flags = c.flags || '{"duplicate_email_cleared": true}'
where exists (select 1 from customers c2 where c2.tenant_id = c.tenant_id and c2.email = c.email and c2.id <> c.id and c2.created_at < c.created_at);

-- Orphans: reservations pointing at a User ID with no contact → placeholder customer (memo: soft-delete only, keep history)
insert into customers (id, tenant_id, account_number, kind, full_name, email, status, flags, source, source_ref, created_at)
select o.user_uuid, o.tenant_id, null, 'individual', coalesce('Deleted account · ' || o.email, 'Deleted account'), null, 'closed',
       '{"deleted_app_account": true}'::jsonb, 'zoho-orphan', o.user_uuid::text, o.first_seen
from (select r.user_uuid, r.tenant_id, min(r.email::text) as email, min(coalesce(r.backend_created_at, r.created_at)) as first_seen
      from legacy.reservations r where r.user_uuid is not null and not exists (select 1 from legacy.contacts c where c.appuser_uuid = r.user_uuid)
      group by r.user_uuid, r.tenant_id) o
on conflict (id) do nothing;

-- counters continue after the highest imported number
insert into tenant_counters (tenant_id, key, value)
select tenant_id, 'customer', max(split_part(account_number, '-', 2)::bigint) from customers where account_number is not null group by tenant_id
on conflict (tenant_id, key) do update set value = greatest(tenant_counters.value, excluded.value);

-- Stored payment instruments from Payment Details (one per customer × provider × token)
insert into payment_instruments (id, tenant_id, customer_id, provider, provider_ref, kind, last4, expiry, status, source, source_ref)
select distinct on (cu.id, lower(pd.payment_type), coalesce(pd.subscription_id_provider, pd.card_last4 || '/' || coalesce(pd.card_expiry,'')))
       import.stable_uuid('instrument', cu.id::text || '|' || lower(pd.payment_type) || '|' || coalesce(pd.subscription_id_provider, pd.card_last4 || '/' || coalesce(pd.card_expiry,''))),
       cu.tenant_id, cu.id, lower(pd.payment_type), pd.subscription_id_provider,
       case when lower(pd.payment_type) in ('stripe','paystack') then 'card' when lower(pd.payment_type) = 'manual' then 'invoice' else 'other' end,
       pd.card_last4, pd.card_expiry, 'active', 'zoho', pd.zoho_id
from legacy.payment_details pd
join legacy.reservations r on r.zoho_id = pd.reservation_zoho_id
join customers cu on cu.id = coalesce(r.user_uuid, (select c.appuser_uuid from legacy.contacts c where c.zoho_id = r.contact_zoho_id), import.stable_uuid('customer', r.contact_zoho_id))
where pd.payment_type is not null and (pd.subscription_id_provider is not null or pd.card_last4 is not null)
order by cu.id, lower(pd.payment_type), coalesce(pd.subscription_id_provider, pd.card_last4 || '/' || coalesce(pd.card_expiry,'')), pd.updated_at desc nulls last;
