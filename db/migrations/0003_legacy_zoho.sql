-- ============================================================================
-- 0003  Legacy schema — the Zoho CRM backup, typed and cleaned, nothing dropped
--
-- This is the EXISTING data, not the future model. Tables mirror the Zoho
-- modules as analysed in docs/source/ZOHO_BACKUP_CRM_IMPORT_SPEC_2.md.
-- Picklists stay verbatim (text). Timestamps converted SAST→UTC. Every row
-- carries market (SA/NO/FI) + tenant_id (RLS) + market_source (how derived).
-- Core rows built from these tables point back via source='zoho', source_ref.
-- ============================================================================
create schema if not exists legacy;
create type legacy.market_code as enum ('SA','NO','FI');

create table legacy.zoho_users (
  zoho_id      text primary key,
  first_name   text, last_name text, email citext,
  role_zoho_id text, role_name text, profile text,
  status       text, user_type text, timezone text,
  created_at   timestamptz, extra jsonb not null default '{}'::jsonb
);

create table legacy.business_partners (
  zoho_id text primary key, tenant_id uuid, market legacy.market_code, market_source text,
  name text, partner_type text, country_raw text, country char(2),
  contact_zoho_id text, phone text, email citext, organisation_raw text,
  spec jsonb not null default '{}'::jsonb, created_at timestamptz, updated_at timestamptz
);

create table legacy.property_prospects (
  zoho_id text primary key, tenant_id uuid, market legacy.market_code, market_source text,
  name text, status text, address text, city text, country_raw text, country char(2),
  building_type text, gross_m2 numeric, net_m2 numeric, agreement_type text,
  revenue_share_pct numeric, revenue_share_85_occ numeric, project_management_fee numeric,
  storebuild_margin numeric, storebuild_status text, steel_supplier text,
  est_installation_cost numeric, est_installation_start date, est_site_open date, project_code text,
  installation_team_zoho_id text, project_folder_url text, status_notes text, follow_up_date date,
  business_partner_zoho_id text, contact_zoho_id text, owner_zoho_id text,
  landlord_form jsonb not null default '{}'::jsonb, unit_mix jsonb not null default '{}'::jsonb,
  is_legacy_property boolean not null default false,        -- came from the dead Properties_C module
  extra jsonb not null default '{}'::jsonb, created_at timestamptz, updated_at timestamptz
);

create table legacy.property_status_history (
  zoho_id text primary key, tenant_id uuid, prospect_zoho_id text,
  from_status text, to_status text, duration_days integer, duration_text text, changed_at timestamptz
);

create table legacy.facilities (
  zoho_id text primary key, tenant_id uuid not null, market legacy.market_code not null, market_source text,
  facility_uuid uuid, name text not null, department_code text, finance_tool_code text, active boolean,
  street text, city text, postal_code text, region text, country_raw text, country char(2),
  lat numeric, lng numeric, google_maps_url text, google_review_url text, currency char(3),
  lettable_units integer, nla_m2 numeric, gfa_m2 numeric, service_units integer, service_unit_label text,
  agreement_type text, franchise_agreement text, monthly_franchise_fee numeric, franchise_fee_currency char(3),
  commission_date date, property_prospect_zoho_id text,
  physical_spec jsonb not null default '{}'::jsonb, security_spec jsonb not null default '{}'::jsonb,
  sms_template_en text, sms_template_no text, app_link_android text, app_link_ios text, description text,
  occupancy_counters jsonb, occupancy_counters_at timestamptz,      -- stale since 2025-12-10; never used live
  owner_zoho_id text, extra jsonb not null default '{}'::jsonb, created_at timestamptz, updated_at timestamptz
);
create unique index on legacy.facilities(facility_uuid) where facility_uuid is not null;

create table legacy.gateways (
  zoho_id text primary key, tenant_id uuid, market legacy.market_code, market_source text,
  facility_zoho_id text, name text, serial text, mac_eth text, mac_wifi text, ip_address text,
  software_version text, hardware_version text, raspbian_version text, connected_controllers text,
  expected_boards text, main_entrance_lock boolean, main_entrance_name text, connectivity_status text,
  controller_error boolean, power_source text, add_state text, placement text, last_report_at timestamptz,
  organisation_raw text, extra jsonb not null default '{}'::jsonb, created_at timestamptz, updated_at timestamptz
);

create table legacy.gateway_country_history (
  zoho_id text primary key, tenant_id uuid, gateway_zoho_id text,
  from_country text, to_country text, duration_days integer, changed_at timestamptz
);

create table legacy.units (
  zoho_id text primary key, tenant_id uuid not null, market legacy.market_code not null, market_source text,
  unit_uuid uuid, easy_id text, name text, facility_zoho_id text not null, status text, status_detail text,
  reservation_uuid uuid, size_label text, level integer, width_m numeric, height_m numeric, depth_m numeric,
  area_m2_calc numeric, volume_m3_calc numeric, lock_type text, lock_id text, sensor_id text,
  gateway_zoho_id text, board_address integer, port_address integer, gateway_name text,
  mezzanine boolean, floor text, has_column boolean, ignore_door_alarm boolean,
  commission_date date, decommission_date date, permanent_note text, note text, system_note text,
  images_available boolean, active boolean, qty_in_demand integer,
  extra jsonb not null default '{}'::jsonb, created_at timestamptz, updated_at timestamptz
);
create unique index on legacy.units(unit_uuid) where unit_uuid is not null;
create index on legacy.units(facility_zoho_id);

create table legacy.contacts (
  zoho_id text primary key, tenant_id uuid not null, market legacy.market_code not null, market_source text,
  population text not null,                                   -- app_user | customer | partner_contact | lead_match | web_visitor
  appuser_uuid uuid, first_name text, last_name text, full_name text, email citext, phone_raw text, phone_e164 text,
  date_of_birth date, street text, city text, postal_code text, country_raw text, country char(2),
  signup_country_raw text, nationality_raw text, preferred_language text,
  is_app_user boolean, app_enabled boolean, email_verified boolean, phone_verified boolean, tcs_accepted boolean,
  credit_check_status text, verified_with text[], signup_type text, username_type text,
  app_created_at timestamptz, app_updated_at timestamptz, financial_tool text, financial_tool_url text,
  email_opt_out boolean, unsubscribed_mode text, unsubscribed_at timestamptz, is_partner_contact boolean,
  client_note text, sms_sent_log text, sms_reply_log text, organisation_raw text, owner_zoho_id text,
  web_activity jsonb not null default '{}'::jsonb, extra jsonb not null default '{}'::jsonb,
  created_at timestamptz, updated_at timestamptz
);
create unique index on legacy.contacts(appuser_uuid) where appuser_uuid is not null;
create index on legacy.contacts(email);

create table legacy.appusers_legacy (
  zoho_id text primary key, appuser_uuid uuid, email citext, first_name text, last_name text, contact_zoho_id text,
  extra jsonb not null default '{}'::jsonb, created_at timestamptz
);

create table legacy.reservations (                          -- Zoho SalesOrders, all 27,214, one row each
  zoho_id text primary key, tenant_id uuid not null, market legacy.market_code not null, market_source text,
  reservation_uuid uuid, order_number text, order_code text, user_uuid uuid, contact_zoho_id text,
  appuser_legacy_zoho_id text, email citext, facility_uuid uuid, facility_zoho_id text, unit_uuid uuid,
  unit_name text, unit_size text, order_status text, payment_status text, subscription_type text,
  currency char(3), price numeric, discounted_price numeric, original_price numeric, discount_code text,
  occupancy_modifier numeric, seasonal_modifier numeric, occupancy_modifier_applied boolean, seasonal_modifier_applied boolean,
  outstanding_amount numeric, remaining_periods integer, start_date date, end_date date, last_occupation_date date,
  backend_created_at timestamptz, booking_platform_raw text, card_last4 text, card_expiry text, card_expiry_status text,
  first_unlock boolean, first_unlock_at timestamptz, welcome_sent_at timestamptz, checkout_sent_at timestamptz,
  cancel_sent_at timestamptz, first_unlock_sent_at timestamptz, card_expiry_sent_at timestamptz,
  contacted_for_feedback boolean, trigger_automation boolean, description text, organisation_raw text, owner_zoho_id text,
  extra jsonb not null default '{}'::jsonb, created_at timestamptz, updated_at timestamptz
);
create unique index on legacy.reservations(reservation_uuid) where reservation_uuid is not null;
create index on legacy.reservations(user_uuid);
create index on legacy.reservations(unit_uuid);
create index on legacy.reservations(order_code);

create table legacy.payment_details (
  zoho_id text primary key, tenant_id uuid, market legacy.market_code, market_source text,
  reservation_zoho_id text, order_code text, order_sequence integer, payment_type text,
  subscription_id_provider text, reference text, card_last4 text, card_expiry text, subscription_type text,
  status text, outstanding_amount numeric, currency char(3), last_payment_at timestamptz, last_payment_txn_id text,
  receipt_url text, status_message text, extra jsonb not null default '{}'::jsonb, created_at timestamptz, updated_at timestamptz
);
create index on legacy.payment_details(reservation_zoho_id);

create table legacy.payments (
  zoho_id text primary key, tenant_id uuid not null, market legacy.market_code not null, market_source text,
  payment_name text, reservation_zoho_id text, payment_details_zoho_id text, contact_zoho_id text,
  provider text, provider_payment_id text, provider_charge_id text, provider_url text, status text,
  payment_type_display text, card_last4 text, currency char(3), total_authorized numeric, total_captured numeric,
  total_declined numeric, total_refunded numeric, available_capture numeric, refund_amount numeric, refund_reason text,
  merchant text, is_test boolean not null default false, transacted_at timestamptz,
  extra jsonb not null default '{}'::jsonb, created_at timestamptz, updated_at timestamptz
);
create index on legacy.payments(reservation_zoho_id);
create index on legacy.payments(transacted_at);

create table legacy.unit_status_history (
  zoho_id text primary key, tenant_id uuid, unit_zoho_id text not null, from_status text, to_status text,
  duration_days integer, duration_text text, seq integer, entered_at timestamptz, reconstructed boolean not null default false
);
create index on legacy.unit_status_history(unit_zoho_id, seq);

create table legacy.reservation_status_history (
  zoho_id text primary key, tenant_id uuid, reservation_zoho_id text not null, from_status text, to_status text,
  payment_status text, facility_uuid uuid, email citext, duration_days integer, duration_text text, seq integer, changed_at timestamptz
);
create index on legacy.reservation_status_history(reservation_zoho_id, seq);

create table legacy.offer_requests (
  zoho_id text primary key, tenant_id uuid, market legacy.market_code, market_source text,
  reservation_zoho_id text, contact_zoho_id text, offer_type text, option_identifier text, option_title text,
  supplier text, amount_insured numeric, price numeric, currency char(3), payment_period text,
  transport jsonb not null default '{}'::jsonb, extra jsonb not null default '{}'::jsonb, created_at timestamptz, updated_at timestamptz
);

create table legacy.communications (
  zoho_id text primary key, tenant_id uuid, market legacy.market_code, market_source text,
  event_name text, reservation_zoho_id text, contact_zoho_id text, facility_zoho_id text, unit_zoho_id text,
  email_sent boolean, sms_sent boolean, payment_attempt_number integer, customer_rating integer,
  customer_feedback text, feedback_platform text, contacted_for_feedback boolean, date_contacted date,
  occupancy_at_event numeric, preferred_language text, snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz, updated_at timestamptz
);
create index on legacy.communications(contact_zoho_id);

create table legacy.emails (
  zoho_id text primary key, tenant_id uuid, parent_module text, parent_zoho_id text, contact_zoho_id text,
  subject text, sent_to citext, sender citext, template_zoho_id text, template_name text, status text,
  opens integer, clicks integer, first_opened_at timestamptz, last_opened_at timestamptz, bounced_at timestamptz,
  bounce_reason text, sent_at timestamptz, extra jsonb not null default '{}'::jsonb
);
create index on legacy.emails(parent_zoho_id);

create table legacy.smses (
  zoho_id text primary key, tenant_id uuid, kind text, body text, reply text, info text, source text,
  related_zoho_id text, submitted_at timestamptz, created_at timestamptz, extra jsonb not null default '{}'::jsonb
);
create index on legacy.smses(related_zoho_id);

create table legacy.calls (
  zoho_id text primary key, tenant_id uuid, market legacy.market_code, market_source text,
  call_type text, contact_zoho_id text, related_zoho_id text, related_module text, subject text,
  started_at timestamptz, duration_s integer, from_number text, to_number text, customer_number text, line_number text,
  recording_url text, owner_zoho_id text, description text, result text, extra jsonb not null default '{}'::jsonb, created_at timestamptz
);
create index on legacy.calls(contact_zoho_id);

create table legacy.notes (
  zoho_id text primary key, tenant_id uuid, parent_module text, parent_zoho_id text, title text, content text,
  owner_zoho_id text, created_at timestamptz, updated_at timestamptz
);
create index on legacy.notes(parent_zoho_id);

create table legacy.tasks (
  zoho_id text primary key, tenant_id uuid, subject text, status text, priority text, due_date date,
  related_module text, related_zoho_id text, owner_zoho_id text, description text, is_auto_missed_chat boolean not null default false,
  closed_at timestamptz, created_at timestamptz, updated_at timestamptz
);

create table legacy.campaigns (
  zoho_id text primary key, tenant_id uuid, name text, campaign_type text, status text, start_date date, end_date date,
  budget numeric, actual_cost numeric, currency char(3), extra jsonb not null default '{}'::jsonb, created_at timestamptz
);
create table legacy.campaign_lead_members (
  zoho_id text primary key, tenant_id uuid, campaign_zoho_id text, lead_zoho_id text, status text, created_at timestamptz
);

create table legacy.leads (
  zoho_id text primary key, tenant_id uuid not null, market legacy.market_code not null, market_source text,
  is_old_contact boolean not null default false,             -- from Old Contacts_C (2022-23 SA web forms)
  lead_source text, lead_status text, first_name text, last_name text, full_name text, company text,
  email citext, phone_raw text, phone_e164 text, city text, state text, country_raw text, country char(2),
  description text, matched_contact_zoho_id text, is_converted boolean,
  web_activity jsonb not null default '{}'::jsonb, ads jsonb not null default '{}'::jsonb,
  owner_zoho_id text, extra jsonb not null default '{}'::jsonb, created_at timestamptz, updated_at timestamptz
);
create index on legacy.leads(email);

create table legacy.attachments (
  zoho_id text primary key, tenant_id uuid, parent_module text, parent_zoho_id text, field_label text,
  file_name text, size_bytes bigint, workdrive_url text, local_path text, created_at timestamptz
);
create index on legacy.attachments(parent_zoho_id);

create table legacy.app_events (                            -- 2.09M rows; partitioned by month on occurred_at
  zoho_id text not null, tenant_id uuid not null, market legacy.market_code, market_source text,
  event_uuid uuid, event_type text, success boolean, heading text, description text,
  details jsonb, details_raw text, occurred_at timestamptz not null,
  user_uuid uuid, reservation_uuid uuid, unit_uuid uuid, facility_uuid uuid, lock_id text,
  contact_zoho_id text, reservation_zoho_id text, unit_zoho_id text, facility_zoho_id text,
  payment_amount numeric, payment_currency char(3), payment_attempt integer, unit_easy_id text,
  share_recipient_email citext, share_recipient_name text, share_start timestamptz, share_end timestamptz,
  first_unlock boolean, extra jsonb, created_at timestamptz,
  primary key (zoho_id, occurred_at)
) partition by range (occurred_at);
create index on legacy.app_events(occurred_at);
create index on legacy.app_events(reservation_uuid) where reservation_uuid is not null;
create index on legacy.app_events(unit_uuid) where unit_uuid is not null;
create index on legacy.app_events(event_type);
do $$
declare d date := date '2020-01-01';
begin
  while d < date '2028-01-01' loop
    execute format('create table if not exists legacy.app_events_%s partition of legacy.app_events for values from (%L) to (%L)', to_char(d,'YYYY_MM'), d, d + interval '1 month');
    d := d + interval '1 month';
  end loop;
end $$;
create table legacy.app_events_default partition of legacy.app_events default;

create table legacy.app_event_gateways (
  zoho_id text primary key, tenant_id uuid, app_event_zoho_id text, gateway_zoho_id text, number_of_locks integer, created_at timestamptz
);

create table legacy.zoho_fields (                            -- Metadata/Fields_001.csv
  module text not null, label text not null, api_name text, data_type text, extra jsonb not null default '{}'::jsonb,
  primary key (module, label)
);
create table legacy.zoho_picklists (                         -- Metadata/PickListFieldProperties_001.csv
  module text not null, field_label text not null, value text not null, seq integer,
  primary key (module, field_label, value)
);
