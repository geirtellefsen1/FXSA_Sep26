-- Communications (backend notifications), workflow emails, SMS log, calls, notes, tasks, offer requests, attachments.
-- optional: zoho_raw.communications(record_id, event, reservation__id, contact__id, facility__id, unit__id, bod_unit__id, email_sent, sms_sent, payment_attempt_number, customer_rating, customer_feedback, feedback_platform, contacted_for_feedback, date_contacted, occupation_of_facility, preferred_language, created_time, modified_time)
-- optional: zoho_raw.emails(record_id, record_name__id, module, subject, to, sent_to, from, sender, template_name__id, template_name, status, no_of_opens, no_of_clicks, first_opened, last_opened, bounced_time, bounce_reason, sent_time, time, created_time)
-- optional: zoho_raw.smses(record_id, sms_name, body, reply, info, source, objectid, submitted, created_time)
-- optional: zoho_raw.calls(record_id, call_type, contact_name__id, related_to__id, related_to_module, subject, call_start_time, call_duration_in_seconds, call_duration, caller_id, dialled_number, voice_recording, call_owner__id, description, call_result, created_time)
-- optional: zoho_raw.notes(record_id, parent__id, parent_module, note_title, note_content, note_owner__id, created_time, modified_time)
-- optional: zoho_raw.tasks(record_id, subject, status, priority, due_date, related_to__id, related_to_module, task_owner__id, description, closed_time, created_time, modified_time)
-- optional: zoho_raw.offer_requests(record_id, reservationid__id, reservation__id, contact__id, offer_type, option_identifier, option_title, supplier, amount_insured, insurance_price, price, currency, payment_period, pickup_address, pickup_time, pickup_date, created_time, modified_time)
-- optional: zoho_raw.attachments(record_id, parent__id, parent_module, file_name, size, workdrive_url, created_time)
-- optional: zoho_raw.file_uploads(record_id, parent__id, parent_module, file_name, field_label, size, created_time)
truncate legacy.communications, legacy.emails, legacy.smses, legacy.calls, legacy.notes, legacy.tasks, legacy.offer_requests, legacy.attachments;

insert into legacy.communications (zoho_id, tenant_id, market, market_source, event_name, reservation_zoho_id, contact_zoho_id, facility_zoho_id, unit_zoho_id, email_sent, sms_sent,
  payment_attempt_number, customer_rating, customer_feedback, feedback_platform, contacted_for_feedback, date_contacted, occupancy_at_event, preferred_language, snapshot, created_at, updated_at)
select import.zoho_prefix(c.record_id), coalesce(lr.tenant_id, lc.tenant_id), coalesce(lr.market, lc.market), case when lr.zoho_id is not null then 'reservation' when lc.zoho_id is not null then 'contact' end,
       import.nz(c.event), lr.zoho_id, import.zoho_prefix(c.contact__id), import.zoho_prefix(c.facility__id), import.zoho_prefix(coalesce(c.unit__id, c.bod_unit__id)),
       import.zoho_bool(c.email_sent), import.zoho_bool(c.sms_sent), import.zoho_int(c.payment_attempt_number), import.zoho_int(c.customer_rating), import.nz(c.customer_feedback),
       import.nz(c.feedback_platform), import.zoho_bool(c.contacted_for_feedback), import.zoho_date(c.date_contacted), import.zoho_num(c.occupation_of_facility), upper(import.nz(c.preferred_language)),
       to_jsonb(c) - '_src_file', import.zoho_ts(c.created_time), import.zoho_ts(c.modified_time)
from zoho_raw.communications c
left join legacy.reservations lr on lr.zoho_id = import.zoho_prefix(c.reservation__id)
left join legacy.contacts lc on lc.zoho_id = import.zoho_prefix(c.contact__id)
where import.nz(c.record_id) is not null;

insert into legacy.emails (zoho_id, tenant_id, parent_module, parent_zoho_id, contact_zoho_id, subject, sent_to, sender, template_zoho_id, template_name, status, opens, clicks,
  first_opened_at, last_opened_at, bounced_at, bounce_reason, sent_at, extra)
select import.zoho_prefix(e.record_id), coalesce(cm.tenant_id, lc.tenant_id), import.nz(e.module), import.zoho_prefix(e.record_name__id),
       case when import.nz(e.module) = 'Contacts' then import.zoho_prefix(e.record_name__id) else cm.contact_zoho_id end,
       import.nz(e.subject), lower(coalesce(import.nz(e.sent_to), import.nz(e."to"))), lower(coalesce(import.nz(e.sender), import.nz(e."from"))), import.zoho_prefix(e.template_name__id),
       import.nz(e.template_name), import.nz(e.status), import.zoho_int(e.no_of_opens), import.zoho_int(e.no_of_clicks), import.zoho_ts(e.first_opened), import.zoho_ts(e.last_opened),
       import.zoho_ts(e.bounced_time), import.nz(e.bounce_reason), import.zoho_ts(coalesce(e.sent_time, e."time", e.created_time)), to_jsonb(e) - '_src_file' - 'attachment_name'
from zoho_raw.emails e
left join legacy.communications cm on cm.zoho_id = import.zoho_prefix(e.record_name__id)
left join legacy.contacts lc on lc.zoho_id = import.zoho_prefix(e.record_name__id)
where import.nz(e.record_id) is not null;

insert into legacy.smses (zoho_id, tenant_id, kind, body, reply, info, source, related_zoho_id, submitted_at, created_at, extra)
select import.zoho_prefix(s.record_id), lc.tenant_id, import.nz(s.sms_name), import.nz(s.body), import.nz(s.reply), import.nz(s.info), import.nz(s.source),
       import.zoho_prefix(s.objectid), import.utc_ts(s.submitted), import.zoho_ts(s.created_time), to_jsonb(s) - '_src_file'
from zoho_raw.smses s
left join legacy.contacts lc on lc.zoho_id = import.zoho_prefix(s.objectid)
where import.nz(s.record_id) is not null;

insert into legacy.calls (zoho_id, tenant_id, market, market_source, call_type, contact_zoho_id, related_zoho_id, related_module, subject, started_at, duration_s, from_number, to_number,
  customer_number, line_number, recording_url, owner_zoho_id, description, result, extra, created_at)
select import.zoho_prefix(c.record_id), coalesce(lc.tenant_id, import.tenant_for_market(m.market)), coalesce(lc.market, m.market),
       case when lc.zoho_id is not null then 'contact' when m.market is not null then 'line' else null end,
       import.nz(c.call_type), import.zoho_prefix(c.contact_name__id), import.zoho_prefix(c.related_to__id), import.nz(c.related_to_module), import.nz(c.subject),
       import.zoho_ts(c.call_start_time), coalesce(import.zoho_int(c.call_duration_in_seconds), import.zoho_int(c.call_duration)),
       case when import.nz(c.call_type) = 'Outbound' then import.nz(c.dialled_number) else import.nz(c.caller_id) end,
       case when import.nz(c.call_type) = 'Outbound' then import.nz(c.caller_id) else import.nz(c.dialled_number) end,
       case when import.nz(c.call_type) = 'Outbound' then import.nz(c.dialled_number) else import.nz(c.caller_id) end,
       case when import.nz(c.call_type) = 'Outbound' then import.nz(c.caller_id) else import.nz(c.dialled_number) end,
       import.nz(c.voice_recording), import.zoho_prefix(c.call_owner__id), import.nz(c.description), import.nz(c.call_result), to_jsonb(c) - '_src_file', import.zoho_ts(c.created_time)
from zoho_raw.calls c
left join legacy.contacts lc on lc.zoho_id = import.zoho_prefix(c.contact_name__id)
cross join lateral (
  select case when regexp_replace(coalesce(c.caller_id,'') || ' ' || coalesce(c.dialled_number,''), '[^0-9+ ]', '', 'g') like '%27214900922%' then 'SA'::legacy.market_code
              when regexp_replace(coalesce(c.caller_id,'') || ' ' || coalesce(c.dialled_number,''), '[^0-9+ ]', '', 'g') like '%4723500057%' then 'NO'::legacy.market_code end as market) m
where import.nz(c.record_id) is not null;

insert into legacy.notes (zoho_id, tenant_id, parent_module, parent_zoho_id, title, content, owner_zoho_id, created_at, updated_at)
select import.zoho_prefix(n.record_id), coalesce(lc.tenant_id, ll_tenant.tenant_id), import.nz(n.parent_module), import.zoho_prefix(n.parent__id), import.nz(n.note_title), import.nz(n.note_content),
       import.zoho_prefix(n.note_owner__id), import.zoho_ts(n.created_time), import.zoho_ts(n.modified_time)
from zoho_raw.notes n
left join legacy.contacts lc on lc.zoho_id = import.zoho_prefix(n.parent__id)
left join legacy.calls ll_tenant on ll_tenant.zoho_id = import.zoho_prefix(n.parent__id)
where import.nz(n.record_id) is not null;

insert into legacy.tasks (zoho_id, tenant_id, subject, status, priority, due_date, related_module, related_zoho_id, owner_zoho_id, description, is_auto_missed_chat, closed_at, created_at, updated_at)
select import.zoho_prefix(t.record_id), coalesce(lc.tenant_id, pp.tenant_id), coalesce(import.nz(t.subject), '?'), import.nz(t.status), import.nz(t.priority), import.zoho_date(t.due_date),
       import.nz(t.related_to_module), import.zoho_prefix(t.related_to__id), import.zoho_prefix(t.task_owner__id), import.nz(t.description),
       coalesce(t.subject, '') ilike 'Follow up : Missed chat%', import.zoho_ts(t.closed_time), import.zoho_ts(t.created_time), import.zoho_ts(t.modified_time)
from zoho_raw.tasks t
left join legacy.contacts lc on lc.zoho_id = import.zoho_prefix(t.related_to__id)
left join legacy.property_prospects pp on pp.zoho_id = import.zoho_prefix(t.related_to__id)
where import.nz(t.record_id) is not null;

insert into legacy.offer_requests (zoho_id, tenant_id, market, market_source, reservation_zoho_id, contact_zoho_id, offer_type, option_identifier, option_title, supplier, amount_insured, price,
  currency, payment_period, transport, extra, created_at, updated_at)
select import.zoho_prefix(o.record_id), coalesce(lr.tenant_id, import.tenant_for_market(import.market_from_currency(o.currency))), coalesce(lr.market, import.market_from_currency(o.currency)),
       case when lr.zoho_id is not null then 'reservation' else 'currency' end, lr.zoho_id, import.zoho_prefix(o.contact__id), upper(import.nz(o.offer_type)), import.nz(o.option_identifier),
       import.nz(o.option_title), import.nz(o.supplier), import.zoho_num(o.amount_insured), coalesce(import.zoho_num(o.insurance_price), import.zoho_num(o.price)), upper(import.nz(o.currency)),
       import.nz(o.payment_period), jsonb_strip_nulls(jsonb_build_object('pickup_address', import.nz(o.pickup_address), 'pickup_time', import.nz(o.pickup_time), 'pickup_date', import.nz(o.pickup_date))),
       to_jsonb(o) - '_src_file', import.zoho_ts(o.created_time), import.zoho_ts(o.modified_time)
from zoho_raw.offer_requests o
left join legacy.reservations lr on lr.zoho_id = import.zoho_prefix(coalesce(o.reservationid__id, o.reservation__id))
where import.nz(o.record_id) is not null;

-- Attachments index: Record Id IS the filename prefix in zoho backup/Attachments/<Record Id>_<original name>
insert into legacy.attachments (zoho_id, tenant_id, parent_module, parent_zoho_id, field_label, file_name, size_bytes, workdrive_url, local_path, created_at)
select import.zoho_prefix(a.record_id), null::uuid, import.nz(a.parent_module), import.zoho_prefix(a.parent__id), null::text, import.nz(a.file_name), import.zoho_num(a.size)::bigint, import.nz(a.workdrive_url),
       'Attachments/' || regexp_replace(coalesce(a.record_id,''), '^zcrm_', '') || '_' || coalesce(a.file_name, ''), import.zoho_ts(a.created_time)
from zoho_raw.attachments a where import.nz(a.record_id) is not null
union all
select import.zoho_prefix(u.record_id), null::uuid, import.nz(u.parent_module), import.zoho_prefix(u.parent__id), coalesce(import.nz(u.field_label), regexp_replace(u._src_file, '_\d+\.csv$', '')),
       import.nz(u.file_name), import.zoho_num(u.size)::bigint, null, null, import.zoho_ts(u.created_time)
from zoho_raw.file_uploads u where import.nz(u.record_id) is not null
on conflict (zoho_id) do nothing;

update legacy.attachments a set tenant_id = coalesce(f.tenant_id, p.tenant_id, c.tenant_id)
from legacy.attachments a2
left join legacy.facilities f on f.zoho_id = a2.parent_zoho_id
left join legacy.property_prospects p on p.zoho_id = a2.parent_zoho_id
left join legacy.contacts c on c.zoho_id = a2.parent_zoho_id
where a.zoho_id = a2.zoho_id;
