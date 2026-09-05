-- Attachments with a core home → documents (facility → site, contact → customer). Prospect files stay legacy-only.
-- Arrears cases for every subscription currently in arrears (the Arrears screen's open list).
-- requires: legacy.attachments(zoho_id)
insert into documents (tenant_id, target_kind, target_id, kind, name, local_path, url, size_bytes, uploaded_at, source, source_ref)
select coalesce(s.tenant_id, cu.tenant_id), case when s.id is not null then 'site' else 'customer' end, coalesce(s.id, cu.id),
       case when a.file_name ilike '%.dwg' or a.field_label ilike '%dwg%' then 'drawing' when a.field_label ilike '%feasib%' then 'feasibility' when a.file_name ilike '%.pdf' then 'other' else 'photo' end,
       coalesce(a.file_name, '?'), a.local_path, a.workdrive_url, a.size_bytes, coalesce(a.created_at, now()), 'zoho', a.zoho_id
from legacy.attachments a
left join sites s on s.source_ref = a.parent_zoho_id
left join legacy.contacts lc on lc.zoho_id = a.parent_zoho_id
left join customers cu on cu.id = coalesce(lc.appuser_uuid, import.stable_uuid('customer', lc.zoho_id))
where s.id is not null or cu.id is not null;

insert into arrears_cases (tenant_id, customer_id, subscription_id, amount_minor, currency, days_overdue, attempts, stage, status, opened_at, source, source_ref)
select s.tenant_id, s.customer_id, s.id, s.outstanding_minor, s.currency,
       coalesce(current_date - (select min(received_at)::date from payments p where p.subscription_id = s.id and p.status = 'failed' and p.received_at > coalesce((select max(received_at) from payments p2 where p2.subscription_id = s.id and p2.status = 'settled'), '1970-01-01')), 0),
       (select count(*) from payments p where p.subscription_id = s.id and p.status = 'failed' and p.received_at > coalesce((select max(received_at) from payments p2 where p2.subscription_id = s.id and p2.status = 'settled'), '1970-01-01')),
       'gentle', 'active', now(), 'zoho', s.source_ref
from subscriptions s where s.status = 'arrears';
update arrears_cases set stage = case when days_overdue >= 60 then 'pre-auction' when days_overdue >= 14 then 'firm' else 'gentle' end;
update customers c set flags = c.flags || '{"arrears": true}' where exists (select 1 from arrears_cases a where a.customer_id = c.id and a.status = 'active');
