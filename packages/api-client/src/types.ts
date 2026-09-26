/**
 * Response shapes for the Day 3 read API. Hand-written from the Zod schemas in apps/api/src/routes/*.ts —
 * kept here rather than importing apps/api directly so the future web app never pulls in server-only deps
 * (fastify, pg). If these drift from the server, /api/openapi.json is the source of truth to re-sync against.
 */

export type Money = { amount_minor: string; currency: string };
export type CustomerRef = { id: string; account_number: string | null; full_name: string | null };
export type SiteRef = { id: string; name: string; short_code: string };
export type UnitRef = { id: string; number: string; display_name: string | null };
export type Page<T> = { items: T[]; next_cursor: string | null };

export type Cockpit = {
  tenants: {
    tenant_id: string;
    slug: string;
    currency: string;
    kpis: {
      mrr: Money; outstanding: Money; outstanding_count: number; collected_today: Money;
      payments_today: number; payments_failed_today: number; moveins_today: number; moveouts_today: number;
      occupancy_avg_pct: number | null; devices_total: number; devices_online: number; devices_degraded: number;
      devices_offline: number; proposals_pending: number;
    };
    site_health: { site_id: string; name: string; short_code: string; occupancy_pct: number | null; units_total: number; units_occupied: number; mrr: Money; spark_14d: number[] }[];
    schedule_today: { kind: 'move-in' | 'move-out' | 'tour'; on_date: string; customer_id: string | null; site_id: string | null; unit_id: string | null; subscription_id: string | null }[];
  }[];
  live_feed: { id: string; ts: string; actor_kind: string; action: string; target_kind: string | null; target_id: string | null; customer_id: string | null; site_id: string | null; severity: string | null; summary: string | null }[];
  proposals: never[];
  incident: null;
};

export type DeviceCounts = { total: number; good: number; watch: number; bad: number; unknown: number };

export type SiteListItem = {
  id: string; slug: string; short_code: string; name: string; city: string | null; region: string | null; country: string | null;
  currency: string; status: string; landlord: { id: string; name: string } | null;
  unit_counts: { total: number; occupied: number; available: number; reserved: number; maintenance: number };
  occupancy_pct: number | null; mrr: Money; device_counts: DeviceCounts;
};

export type UnitListItem = {
  id: string; number: string; display_name: string | null; size_value: string | null; size_unit: string | null;
  tier: string; status: string; status_detail: string | null; unit_type_name: string | null;
  listed_price: Money | null; current_subscription_id: string | null;
};

export type CustomerListItem = {
  id: string; account_number: string | null; kind: string; full_name: string | null; email: string | null; phone: string | null;
  status: string; kyc_status: string; flags: Record<string, unknown>; customer_since: string | null; tags: string[];
};

export type Customer360 = {
  customer: Record<string, unknown>;
  subscriptions: { id: string; unit: UnitRef; site: SiteRef; price: Money; status: string; started_at: string | null; ends_at: string | null; next_bill_at: string | null; billing_day: number | null }[];
  recent_payments: { id: string; method: string; status: string; amount: Money; received_at: string | null }[];
  recent_messages: { id: string; channel: string; direction: string; sent_at: string; subject: string | null; snippet: string | null }[];
  tags: string[];
  notes: { id: string; body_md: string; author_kind: string; pinned: boolean; created_at: string }[];
  documents: { id: string; kind: string; name: string; url: string | null; uploaded_at: string }[];
};

export type TimelineRow = { id: string; ts: string; actor_kind: string; action: string; summary: string | null; severity: string | null; payload: Record<string, unknown> };

export type SubscriptionListItem = {
  id: string; customer: CustomerRef; unit: UnitRef; site: SiteRef; status: string; price: Money;
  billing_period: string; billing_day: number | null; started_at: string | null; ends_at: string | null; next_bill_at: string | null;
};

export type PaymentListItem = {
  id: string; customer: CustomerRef | null; subscription_id: string | null; method: string; provider: string | null;
  status: string; amount: Money; card_last4: string | null; received_at: string | null;
};

export type LeadListItem = {
  id: string; lead_number: string | null; name: string; email: string | null; phone: string | null; source: string | null;
  stage: string; site: { id: string; name: string } | null; value_estimate: Money | null; score: number | null;
  is_recurring: boolean; last_touch_at: string | null;
};

export type ArrearsItem = { subscription_id: string; customer: CustomerRef; site: SiteRef; unit: UnitRef; amount: Money; days_overdue: number; stage: string; case_status: string };

export type DeviceNode = { id: string; kind: string; name: string; model: string | null; status: string; last_ping_at: string | null; port: number | null; unit_id: string | null; children: DeviceNode[] };
export type DeviceSiteSummary = { site_id: string; name: string; short_code: string; device_counts: DeviceCounts; gateways: number };

export type ImportModule = { legacy_table: string; core_table: string | null; legacy_rows: number; core_rows: number | null };
export type ImportRun = { id: string; kind: string; source_label: string | null; started_at: string; finished_at: string | null; status: string; error: string | null };
export type ImportCheck = { id: string; stage: string; name: string; expected: string | null; actual: string | null; passed: boolean | null; severity: string; checked_at: string };
export type MarketSourceRow = { table: string; by_source: Record<string, number> };
