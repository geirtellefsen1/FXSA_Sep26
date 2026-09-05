-- Contacts: three populations (app users, SalesIQ web-visitor stubs, partner people). Market derivation per spec §3.3:
--   financial tool (Xero→SA, PowerOffice→NO) → reservation facility → country → organisation → owner role → default.
-- requires: zoho_raw.contacts(record_id, last_name)
-- optional: zoho_raw.contacts(first_name, full_name, email, phone, mobile, date_of_birth, mailing_street, mailing_city, mailing_zip, mailing_country, street, city, postal_code, country, signup_country, nationality, preferred_language, app_user, appuser_uuid, enabled, emailaddressverified, phonenumberverified, tcs_accepted, credit_check_status, verified_with, signup_type, username_type, usercreatedate, userlastmodifieddate, financial_tool, financial_tool_url, email_opt_out, unsubscribed_mode, unsubscribed_time, business_partner_contact, client_note, sms_sent, sms_reply, organisation, contact_owner__id, first_visit, most_recent_visit, days_visited, number_of_chats, referrer, first_page_visited, average_time_spent_minutes, average_time_spent, visitor_score, created_time, modified_time)
-- optional: zoho_raw.appusers_legacy(record_id, appuser_uuid, uuid, email, first_name, last_name, contact__id, created_time)
truncate legacy.contacts, legacy.appusers_legacy cascade;

insert into legacy.appusers_legacy (zoho_id, appuser_uuid, email, first_name, last_name, contact_zoho_id, extra, created_at)
select import.zoho_prefix(record_id), import.zoho_uuid(coalesce(appuser_uuid, uuid)), lower(import.nz(email)), import.nz(first_name), import.nz(last_name),
       import.zoho_prefix(contact__id), to_jsonb(r) - '_src_file', import.zoho_ts(created_time)
from zoho_raw.appusers_legacy r where import.nz(record_id) is not null;

create temp table _contact_res_market as
select import.zoho_prefix(r.contact_appuser__id) as contact_zoho_id, import.zoho_uuid(r.user_id) as user_uuid, f.market,
       row_number() over (partition by import.zoho_prefix(r.contact_appuser__id) order by import.zoho_ts(r.created_time) desc nulls last) as rn_c,
       row_number() over (partition by import.zoho_uuid(r.user_id) order by import.zoho_ts(r.created_time) desc nulls last) as rn_u
from zoho_raw.reservations r
join legacy.facilities f on f.zoho_id = import.zoho_prefix(r.facility__id);

insert into legacy.contacts (zoho_id, tenant_id, market, market_source, population, appuser_uuid, first_name, last_name, full_name, email, phone_raw, phone_e164, date_of_birth,
  street, city, postal_code, country_raw, country, signup_country_raw, nationality_raw, preferred_language, is_app_user, app_enabled, email_verified, phone_verified, tcs_accepted,
  credit_check_status, verified_with, signup_type, username_type, app_created_at, app_updated_at, financial_tool, financial_tool_url, email_opt_out, unsubscribed_mode, unsubscribed_at,
  is_partner_contact, client_note, sms_sent_log, sms_reply_log, organisation_raw, owner_zoho_id, web_activity, extra, created_at, updated_at)
select import.zoho_prefix(c.record_id), import.tenant_for_market(m.market), m.market, m.src,
       case when coalesce(import.zoho_bool(c.app_user), false) or import.zoho_uuid(c.appuser_uuid) is not null then 'app_user'
            when coalesce(import.zoho_bool(c.business_partner_contact), false) then 'partner_contact'
            when res.market is not null or res_u.market is not null then 'customer'
            when exists (select 1 from zoho_raw.leads l where lower(import.nz(l.email)) = lower(import.nz(c.email)) and import.nz(c.email) is not null) then 'lead_match'
            when import.nz(c.visitor_score) is not null or import.nz(c.first_visit) is not null then 'web_visitor'
            when import.nz(c.email) is null and import.nz(coalesce(c.mobile, c.phone)) is null then 'web_visitor'
            else 'customer' end,
       import.zoho_uuid(c.appuser_uuid), import.nz(c.first_name), import.nz(c.last_name),
       coalesce(import.nz(c.full_name), nullif(trim(coalesce(import.nz(c.first_name),'') || ' ' || coalesce(import.nz(c.last_name),'')), '')),
       lower(import.nz(c.email)), coalesce(import.nz(c.mobile), import.nz(c.phone)), import.phone_e164(coalesce(c.mobile, c.phone), m.market),
       case when {{IMPORT_DOB}} then import.zoho_date(c.date_of_birth) end,
       coalesce(import.nz(c.mailing_street), import.nz(c.street)), coalesce(import.nz(c.mailing_city), import.nz(c.city)), coalesce(import.nz(c.mailing_zip), import.nz(c.postal_code)),
       coalesce(import.nz(c.mailing_country), import.nz(c.country)), import.country_iso(coalesce(c.mailing_country, c.country)), import.nz(c.signup_country), import.nz(c.nationality),
       upper(import.nz(c.preferred_language)), coalesce(import.zoho_bool(c.app_user), import.zoho_uuid(c.appuser_uuid) is not null), import.zoho_bool(c.enabled),
       import.zoho_bool(c.emailaddressverified), import.zoho_bool(c.phonenumberverified), import.zoho_bool(c.tcs_accepted), upper(import.nz(c.credit_check_status)),
       case when import.nz(c.verified_with) is not null then regexp_split_to_array(upper(c.verified_with), '\s*[,;]\s*') end,
       import.nz(c.signup_type), import.nz(c.username_type), import.zoho_ts(c.usercreatedate), import.zoho_ts(c.userlastmodifieddate), import.nz(c.financial_tool), import.nz(c.financial_tool_url),
       coalesce(import.zoho_bool(c.email_opt_out), false), import.nz(c.unsubscribed_mode), import.zoho_ts(c.unsubscribed_time), coalesce(import.zoho_bool(c.business_partner_contact), false),
       import.nz(c.client_note), import.nz(c.sms_sent), import.nz(c.sms_reply), import.nz(c.organisation), import.zoho_prefix(c.contact_owner__id),
       jsonb_strip_nulls(jsonb_build_object('first_visit', import.zoho_ts(c.first_visit), 'most_recent_visit', import.zoho_ts(c.most_recent_visit), 'days_visited', import.zoho_int(c.days_visited),
         'number_of_chats', import.zoho_int(c.number_of_chats), 'referrer', import.nz(c.referrer), 'first_page_visited', import.nz(c.first_page_visited),
         'average_time_spent', coalesce(import.nz(c.average_time_spent_minutes), import.nz(c.average_time_spent)), 'visitor_score', import.nz(c.visitor_score))),
       to_jsonb(c) - '_src_file' - 'date_of_birth', import.zoho_ts(c.created_time), import.zoho_ts(c.modified_time)
from zoho_raw.contacts c
left join _contact_res_market res on res.contact_zoho_id = import.zoho_prefix(c.record_id) and res.rn_c = 1
left join _contact_res_market res_u on res_u.user_uuid = import.zoho_uuid(c.appuser_uuid) and res_u.rn_u = 1 and res.market is null
left join legacy.zoho_users own on own.zoho_id = import.zoho_prefix(c.contact_owner__id)
cross join lateral (
  select coalesce(import.market_from_financial_tool(c.financial_tool), res.market, res_u.market,
                  import.market_from_country(import.country_iso(coalesce(c.mailing_country, c.country, c.signup_country))),
                  import.market_from_org(c.organisation),
                  case when own.role_name ilike '%south africa%' and own.role_name not ilike '%norway%' then 'SA'::legacy.market_code
                       when own.role_name ilike '%norway%' and own.role_name not ilike '%south africa%' then 'NO'::legacy.market_code
                       when own.role_name ilike '%finland%' then 'FI'::legacy.market_code end,
                  'NO'::legacy.market_code) as market,
         case when import.market_from_financial_tool(c.financial_tool) is not null then 'financial_tool'
              when res.market is not null or res_u.market is not null then 'reservation'
              when import.market_from_country(import.country_iso(coalesce(c.mailing_country, c.country, c.signup_country))) is not null then 'country'
              when import.market_from_org(c.organisation) is not null then 'organisation'
              when own.role_name ilike any (array['%south africa%','%norway%','%finland%']) then 'owner_role'
              else 'default' end as src) m
where import.nz(c.record_id) is not null;
drop table _contact_res_market;
