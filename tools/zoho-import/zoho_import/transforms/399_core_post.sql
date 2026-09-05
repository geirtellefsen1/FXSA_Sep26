-- Post-load: unit status vs. subscription consistency, counters, import bookkeeping.
-- requires: legacy.facilities(zoho_id)
update units u set status = 'occupied' where u.status = 'available' and exists (select 1 from subscriptions s where s.id = u.current_subscription_id and s.status in ('active','arrears','notice_given'));
update units u set current_subscription_id = null where u.current_subscription_id is not null and exists (select 1 from subscriptions s where s.id = u.current_subscription_id and s.status = 'closed');
insert into tenant_counters (tenant_id, key, value) select id, 'invoice', 0 from tenants on conflict do nothing;
update import.runs set summary = summary || jsonb_build_object('core', jsonb_build_object(
  'sites', (select count(*) from sites), 'units', (select count(*) from units), 'customers', (select count(*) from customers), 'subscriptions', (select count(*) from subscriptions),
  'reservations', (select count(*) from reservations), 'payments', (select count(*) from payments), 'leads', (select count(*) from leads), 'conversations', (select count(*) from conversations),
  'messages', (select count(*) from messages), 'activity_log', (select count(*) from activity_log), 'devices', (select count(*) from devices), 'documents', (select count(*) from documents)))
where id = '{{RUN_ID}}'::uuid;
