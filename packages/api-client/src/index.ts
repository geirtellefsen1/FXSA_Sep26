import type {
  ArrearsItem, Cockpit, Customer360, CustomerListItem, DeviceNode, DeviceSiteSummary, ImportCheck, ImportModule,
  ImportRun, LeadListItem, MarketSourceRow, Page, PaymentListItem, SiteListItem, SubscriptionListItem, TimelineRow,
  UnitListItem,
} from './types.js';

export * from './types.js';

export type ClientConfig = {
  baseUrl: string;
  /** Development-only header auth; replaced by a session cookie once Sprint 2 Day 7 ships real login. */
  devUser?: string;
  tenant?: string; // slug, or 'all'
};

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: unknown,
  ) {
    super(`API error ${status}`);
  }
}

function qs(params: Record<string, string | number | undefined>): string {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined) usp.set(k, String(v));
  const s = usp.toString();
  return s ? `?${s}` : '';
}

export class FxApiClient {
  constructor(private cfg: ClientConfig) {}

  private async get<T>(path: string): Promise<T> {
    const headers: Record<string, string> = {};
    if (this.cfg.devUser) headers['X-Dev-User'] = this.cfg.devUser;
    if (this.cfg.tenant) headers['X-Tenant'] = this.cfg.tenant;
    const res = await fetch(`${this.cfg.baseUrl}${path}`, { headers });
    const body = await res.json();
    if (!res.ok) throw new ApiError(res.status, body);
    return body as T;
  }

  me() {
    return this.get<{ user: { id: string; email: string; full_name: string | null; is_org_admin: boolean }; memberships: unknown[]; scope: unknown }>('/api/me');
  }

  cockpit() {
    return this.get<Cockpit>('/api/cockpit');
  }

  sites(opts: { limit?: number; cursor?: string } = {}) {
    return this.get<Page<SiteListItem>>(`/api/sites${qs(opts)}`);
  }
  site(id: string) {
    return this.get<{ site: Record<string, unknown>; zones: unknown[]; unit_types: unknown[]; agreements: unknown[]; landlord: Record<string, unknown> | null; device_counts: unknown }>(`/api/sites/${id}`);
  }
  siteUnits(id: string, opts: { limit?: number; cursor?: string } = {}) {
    return this.get<Page<UnitListItem>>(`/api/sites/${id}/units${qs(opts)}`);
  }
  unit(id: string) {
    return this.get<{ unit: Record<string, unknown>; site: { id: string; name: string; short_code: string }; unit_type: Record<string, unknown> | null; current_subscription: { id: string; customer_id: string; customer_name: string | null; status: string } | null; devices: { hub: unknown; gateway: unknown; lock: unknown } }>(`/api/units/${id}`);
  }

  customers(opts: { q?: string; site?: string; status?: string; limit?: number; cursor?: string } = {}) {
    return this.get<Page<CustomerListItem>>(`/api/customers${qs(opts)}`);
  }
  customer(id: string) {
    return this.get<Customer360>(`/api/customers/${id}`);
  }
  customerTimeline(id: string, opts: { from?: string; to?: string; kind?: string; limit?: number; cursor?: string } = {}) {
    return this.get<Page<TimelineRow>>(`/api/customers/${id}/timeline${qs(opts)}`);
  }
  customerLegacy(id: string) {
    return this.get<{ available: false } | { available: true; contact: Record<string, unknown>; counts: { reservations: number; payments: number; communications: number } }>(`/api/customers/${id}/legacy`);
  }

  subscriptions(opts: { status?: string; site?: string; customer?: string; limit?: number; cursor?: string } = {}) {
    return this.get<Page<SubscriptionListItem>>(`/api/subscriptions${qs(opts)}`);
  }
  payments(opts: { status?: string; from?: string; to?: string; customer?: string; limit?: number; cursor?: string } = {}) {
    return this.get<Page<PaymentListItem>>(`/api/payments${qs(opts)}`);
  }

  leads(opts: { stage?: string; site?: string; q?: string; limit?: number; cursor?: string } = {}) {
    return this.get<Page<LeadListItem>>(`/api/leads${qs(opts)}`);
  }
  lead(id: string) {
    return this.get<{ lead: Record<string, unknown>; conversation: { id: string; last_message_at: string | null; unread_count: number } | null }>(`/api/leads/${id}`);
  }

  arrears(opts: { limit?: number; cursor?: string } = {}) {
    return this.get<Page<ArrearsItem>>(`/api/arrears${qs(opts)}`);
  }

  deviceSites() {
    return this.get<{ items: DeviceSiteSummary[] }>('/api/devices/sites');
  }
  deviceSiteTree(siteId: string) {
    return this.get<{ site: { id: string; name: string }; tree: DeviceNode[] }>(`/api/devices/sites/${siteId}`);
  }
  device(id: string) {
    return this.get<{ device: Record<string, unknown>; parent: Record<string, unknown> | null; children: unknown[]; unit: { id: string; number: string } | null }>(`/api/devices/${id}`);
  }

  importRuns(opts: { limit?: number; cursor?: string } = {}) {
    return this.get<Page<ImportRun>>(`/api/import/runs${qs(opts)}`);
  }
  importRunChecks(id: string) {
    return this.get<{ items: ImportCheck[] }>(`/api/import/runs/${id}/checks`);
  }
  importModules() {
    return this.get<{ items: ImportModule[] }>('/api/import/modules');
  }
  importMarketSources() {
    return this.get<{ items: MarketSourceRow[] }>('/api/import/market-sources');
  }
}
