-- Flexistore group: one org, three operating tenants. Ids are stable and
-- referenced by the importer (tools/zoho-import/zoho_import/config.py).
insert into orgs (id, slug, name) values
  ('00000000-0000-4000-8000-000000000001', 'flexistore', 'Flexistore International')
on conflict (slug) do nothing;

insert into tenants (id, org_id, slug, name, legal_name, country, currency, timezone, locale, vat_rate, support_phone, support_email, integrations, settings) values
  ('00000000-0000-4000-8000-00000000005a', '00000000-0000-4000-8000-000000000001', 'fxsa', 'Flexistore South Africa', 'Flexistore South Africa (Pty) Ltd', 'ZA', 'ZAR', 'Africa/Johannesburg', 'en-ZA', 0.1500, '+27214900922', 'info@flexistore.co.za',
     '{"payments":["paystack","stripe"],"accounting":"xero","kyc":["sumsub","verifyid"],"channels":["whatsapp","email","sms"],"access":"flexilock-rpi"}',
     '{"market":"SA","size_unit":"m2","customer_id_prefix":"C","invoice_prefix":"INV"}'),
  ('00000000-0000-4000-8000-00000000004e', '00000000-0000-4000-8000-000000000001', 'fxno', 'Flexistore Norway', 'Flexistore AS', 'NO', 'NOK', 'Europe/Oslo', 'nb-NO', 0.2500, '+4723500057', 'support@flexistore.no',
     '{"payments":["stripe","vipps"],"accounting":"poweroffice","kyc":["vipps","bankid"],"channels":["email","sms"],"access":"flexilock-rpi"}',
     '{"market":"NO","size_unit":"m3","customer_id_prefix":"C","invoice_prefix":"INV"}'),
  ('00000000-0000-4000-8000-000000000046', '00000000-0000-4000-8000-000000000001', 'fxfi', 'Flexistore Finland', 'Flexistore Finland Oy', 'FI', 'EUR', 'Europe/Helsinki', 'fi-FI', 0.2550, null, null,
     '{"payments":["stripe"],"accounting":null,"kyc":[],"channels":["email"],"access":"flexilock-rpi","franchise":"PPU"}',
     '{"market":"FI","size_unit":"m3","customer_id_prefix":"C","invoice_prefix":"INV"}')
on conflict (slug) do nothing;

insert into agent_capabilities (id, label, description, side_effect_endpoint) values
  ('reply_routine_chat',           'Reply to routine chat',            'WhatsApp / chat / email intent matches',  'POST /api/inbox/{conversation_id}/messages'),
  ('send_payment_reminder_gentle', 'Gentle payment reminder',          '1st reminder, day 7',                     'POST /api/invoices/{id}/reminder'),
  ('send_payment_reminder_firm',   'Firm payment reminder',            '2nd/3rd + card retry',                    'POST /api/invoices/{id}/reminder'),
  ('reissue_kyc_link',             'Re-issue KYC link',                '',                                        'POST /api/customers/{id}/kyc/reissue'),
  ('adjust_listed_price_pct_10',   'Adjust listed price ≤10%',         '',                                        'POST /api/pricing/rules/{id}/override'),
  ('remote_unlock_customer_unit',  'Remote-unlock a customer unit',    '',                                        'POST /api/devices/locks/{lock_id}/unlock'),
  ('issue_refund_small',           'Issue small refund',               'below tenant threshold',                  'POST /api/payments/{id}/refund'),
  ('issue_refund_large',           'Issue large refund',               'above tenant threshold',                  'POST /api/payments/{id}/refund'),
  ('cancel_subscription',          'Cancel subscription',              '',                                        'POST /api/subscriptions/{id}/cancel'),
  ('dispatch_technician_to_site',  'Dispatch technician',              '',                                        'POST /api/facilities/{id}/tickets'),
  ('power_cycle_poe_segment',      'Power-cycle PoE segment',          '',                                        'POST /api/devices/gateways/{id}/poe/{port}/cycle'),
  ('push_listing_to_auction',      'Push listing to auction platform', '',                                        'POST /api/auctions'),
  ('issue_winner_key_to_auction_buyer','Issue auction winner key',     '',                                        'POST /api/access/units/{unit_id}/issue-key')
on conflict (id) do nothing;
