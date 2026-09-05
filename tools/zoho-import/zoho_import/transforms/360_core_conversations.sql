-- One conversation per customer; imported emails, SMS, calls and SalesIQ chat transcripts become messages.
-- Backend notifications (legacy.communications) are events, not messages → activity_log (370).
-- requires: legacy.contacts(zoho_id)

create temp table _cust as
select c.zoho_id, cu.id as customer_id, cu.tenant_id
from legacy.contacts c join customers cu on cu.tenant_id = c.tenant_id and cu.id = coalesce(c.appuser_uuid, import.stable_uuid('customer', c.zoho_id));

create temp table _msgs (tenant_id uuid, customer_id uuid, channel text, direction text, author_kind text, sent_at timestamptz, subject text, body text, provider_status text, template_id text, meta jsonb, source_ref text);

insert into _msgs
select cu.tenant_id, cu.customer_id, 'email', 'outbound', 'system', e.sent_at, e.subject, null, lower(e.status), e.template_zoho_id,
       jsonb_strip_nulls(jsonb_build_object('to', e.sent_to, 'from', e.sender, 'template', e.template_name, 'opens', e.opens, 'clicks', e.clicks, 'first_opened_at', e.first_opened_at,
         'bounce_reason', e.bounce_reason, 'notification_zoho_id', case when e.parent_module <> 'Contacts' then e.parent_zoho_id end)), e.zoho_id
from legacy.emails e
join _cust cu on cu.zoho_id = coalesce(e.contact_zoho_id, e.parent_zoho_id)
where e.sent_at is not null;

insert into _msgs
select cu.tenant_id, cu.customer_id, 'sms', case when s.kind ilike 'reply%' then 'inbound' else 'outbound' end, case when s.kind ilike 'reply%' then 'customer' else 'system' end,
       coalesce(s.submitted_at, s.created_at), null, coalesce(case when s.kind ilike 'reply%' then s.reply end, s.body), lower(s.kind), null,
       jsonb_strip_nulls(jsonb_build_object('info', s.info, 'source', s.source)), s.zoho_id
from legacy.smses s join _cust cu on cu.zoho_id = s.related_zoho_id where coalesce(s.submitted_at, s.created_at) is not null;

insert into _msgs
select cu.tenant_id, cu.customer_id, 'phone', case when c.call_type = 'Outbound' then 'outbound' else 'inbound' end, case when c.call_type = 'Outbound' then 'operator' else 'customer' end,
       coalesce(c.started_at, c.created_at), c.subject, c.description, lower(c.call_type), null,
       jsonb_strip_nulls(jsonb_build_object('duration_s', c.duration_s, 'missed', c.call_type = 'Missed', 'from', c.from_number, 'to', c.to_number, 'recording_url', c.recording_url, 'result', c.result)), c.zoho_id
from legacy.calls c join _cust cu on cu.zoho_id = c.contact_zoho_id where coalesce(c.started_at, c.created_at) is not null;

insert into _msgs
select cu.tenant_id, cu.customer_id, 'chat', 'inbound', 'customer', n.created_at, n.title, n.content, 'closed', null, '{"salesiq_transcript": true}'::jsonb, n.zoho_id
from legacy.notes n join _cust cu on cu.zoho_id = n.parent_zoho_id
where n.title ilike '%salesiq%' and n.created_at is not null;

insert into conversations (id, tenant_id, customer_id, subject, channels, status, last_message_at, source)
select import.stable_uuid('conversation', m.customer_id::text), m.tenant_id, m.customer_id, 'Imported history', array_agg(distinct m.channel::channel_kind), 'closed', max(m.sent_at), 'zoho'
from _msgs m group by m.tenant_id, m.customer_id;

insert into messages (tenant_id, conversation_id, channel, direction, author_kind, sent_at, subject, body, provider_status, template_id, meta, source, source_ref)
select m.tenant_id, cv.id, m.channel::channel_kind, m.direction, m.author_kind::author_kind, m.sent_at, m.subject, m.body, m.provider_status, m.template_id, m.meta, 'zoho', m.source_ref
from _msgs m join conversations cv on cv.customer_id = m.customer_id;

-- operator notes that are not chat transcripts
insert into notes (tenant_id, target_kind, target_id, body_md, author_kind, author_id, created_at, source, source_ref)
select cu.tenant_id, 'customer', cu.customer_id, coalesce(n.title || E'\n\n', '') || coalesce(n.content, ''), 'operator', u.id, coalesce(n.created_at, now()), 'zoho', n.zoho_id
from legacy.notes n join _cust cu on cu.zoho_id = n.parent_zoho_id
left join users u on u.source = 'zoho' and u.source_ref = n.owner_zoho_id
where coalesce(n.title, '') not ilike '%salesiq%' and coalesce(n.content, n.title) is not null;

-- lead conversations from SalesIQ chat notes on leads
insert into conversations (id, tenant_id, lead_id, subject, channels, status, last_message_at, source)
select import.stable_uuid('conversation', l.id::text), l.tenant_id, l.id, 'Imported chat', '{chat}', 'closed', max(n.created_at), 'zoho'
from legacy.notes n join leads l on l.origin = 'zoho' and l.source_ref = n.parent_zoho_id
where n.created_at is not null group by l.id, l.tenant_id;
insert into messages (tenant_id, conversation_id, channel, direction, author_kind, sent_at, subject, body, provider_status, meta, source, source_ref)
select l.tenant_id, cv.id, 'chat', 'inbound', 'customer', n.created_at, n.title, n.content, 'closed', '{"salesiq_transcript": true}'::jsonb, 'zoho', n.zoho_id
from legacy.notes n join leads l on l.origin = 'zoho' and l.source_ref = n.parent_zoho_id join conversations cv on cv.lead_id = l.id
where n.created_at is not null;
update leads l set conversation_id = cv.id from conversations cv where cv.lead_id = l.id;
drop table _cust; drop table _msgs;
