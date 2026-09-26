import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { createTestDatabase } from './helpers/db.js';

let db: Awaited<ReturnType<typeof createTestDatabase>>;
let app: Awaited<ReturnType<typeof buildApp>>;

const SA = { 'x-dev-user': 'geir@flexistore.no', 'x-tenant': 'fxsa' };
const NO = { 'x-dev-user': 'geir@flexistore.no', 'x-tenant': 'fxno' };

beforeAll(async () => {
  db = await createTestDatabase();
  app = await buildApp({ databaseUrl: db.appDsn, devAuth: true, logger: false });
});
afterAll(async () => {
  await app.close();
  await db.drop();
});

async function get(url: string, headers: Record<string, string> = SA) {
  const r = await app.inject({ url, headers });
  return { status: r.statusCode, body: r.json() };
}

describe('cockpit', () => {
  it('returns KPIs, site health with a 14-day spark, and a last-hour feed for the scoped tenant', async () => {
    const { status, body } = await get('/api/cockpit');
    expect(status).toBe(200);
    expect(body.tenants).toHaveLength(1);
    const t = body.tenants[0];
    expect(t.slug).toBe('fxsa');
    expect(t.kpis.mrr.currency).toBe('ZAR');
    expect(typeof t.kpis.outstanding_count).toBe('number');
    expect(t.site_health[0].spark_14d).toHaveLength(14);
    expect(body.proposals).toEqual([]);
    expect(body.incident).toBeNull();
  });
  it('RLS: fxno scope never sees an fxsa site', async () => {
    const { body } = await get('/api/cockpit', NO);
    expect(body.tenants[0].slug).toBe('fxno');
    expect(body.tenants[0].site_health.every((s: { short_code: string }) => s.short_code !== 'RBM')).toBe(true);
  });
});

describe('sites & units', () => {
  it('lists sites with occupancy, mrr and device counts', async () => {
    const { status, body } = await get('/api/sites');
    expect(status).toBe(200);
    const rbm = body.items.find((s: { short_code: string }) => s.short_code === 'RBM');
    expect(rbm.unit_counts.total).toBe(3);
    expect(rbm.mrr.currency).toBe('ZAR');
    expect(rbm.device_counts.total).toBe(rbm.device_counts.good + rbm.device_counts.watch + rbm.device_counts.bad + rbm.device_counts.unknown);
  });
  it('site detail includes zones, unit types, agreements, landlord', async () => {
    const sites = (await get('/api/sites')).body.items;
    const rbm = sites.find((s: { short_code: string }) => s.short_code === 'RBM');
    const { status, body } = await get(`/api/sites/${rbm.id}`);
    expect(status).toBe(200);
    expect(body.landlord.name).toBe('Hyprop Investments');
    expect(body.zones.length).toBeGreaterThan(0);
  });
  it('404s a site that does not exist', async () => {
    const { status } = await get('/api/sites/00000000-0000-4000-8000-000000000099');
    expect(status).toBe(404);
  });
  it('lists units for a site and a unit detail links its wiring', async () => {
    const sites = (await get('/api/sites')).body.items;
    const rbm = sites.find((s: { short_code: string }) => s.short_code === 'RBM');
    const units = (await get(`/api/sites/${rbm.id}/units`)).body.items;
    expect(units.length).toBe(3);
    const occupied = units.find((u: { status: string }) => u.status === 'occupied');
    const { status, body } = await get(`/api/units/${occupied.id}`);
    expect(status).toBe(200);
    expect(body.devices.hub).toBeTruthy();
    expect(body.current_subscription).toBeTruthy();
  });
  it('RLS: fxno scope cannot fetch an fxsa unit by id', async () => {
    const sites = (await get('/api/sites')).body.items;
    const rbm = sites.find((s: { short_code: string }) => s.short_code === 'RBM');
    const units = (await get(`/api/sites/${rbm.id}/units`)).body.items;
    const { status } = await get(`/api/units/${units[0].id}`, NO);
    expect(status).toBe(404);
  });
});

describe('customers', () => {
  it('searches by name and returns tags/flags', async () => {
    const { body } = await get('/api/customers?q=Tinus');
    expect(body.items[0].full_name).toBe('Tinus Greyling');
  });
  it('360 bundle has subscriptions, payments, messages', async () => {
    const cust = (await get('/api/customers?q=Tinus')).body.items[0];
    const { status, body } = await get(`/api/customers/${cust.id}`);
    expect(status).toBe(200);
    expect(body.subscriptions[0].price.currency).toBe('ZAR');
    expect(body.recent_payments.length).toBeGreaterThan(0);
    expect(body.recent_messages.length).toBeGreaterThan(0);
  });
  it('timeline is filterable and returns the SAST→UTC-converted unlock event', async () => {
    const cust = (await get('/api/customers?q=Tinus')).body.items[0];
    const { body } = await get(`/api/customers/${cust.id}/timeline?kind=lock`);
    expect(body.items.some((e: { action: string }) => e.action === 'lock.unlock')).toBe(true);
    expect(body.items.find((e: { action: string }) => e.action === 'lock.unlock').ts).toBe('2024-01-15T07:10:00.000Z');
  });
  it('legacy tab returns the Zoho contact row for a zoho-sourced customer', async () => {
    const cust = (await get('/api/customers?q=Tinus')).body.items[0];
    const { body } = await get(`/api/customers/${cust.id}/legacy`);
    expect(body.available).toBe(true);
    expect(body.contact.email).toBe('tinus.g@example.com');
    expect(body.counts.payments).toBeGreaterThan(0);
  });
  it('RLS: a customer visible in fxsa scope 404s under fxno scope', async () => {
    const cust = (await get('/api/customers?q=Tinus')).body.items[0];
    const { status } = await get(`/api/customers/${cust.id}`, NO);
    expect(status).toBe(404);
  });
});

describe('subscriptions & payments', () => {
  it('lists subscriptions with customer/unit/site refs', async () => {
    const { body } = await get('/api/subscriptions');
    expect(body.items.length).toBeGreaterThan(0);
    expect(body.items[0].customer.full_name).toBeTruthy();
  });
  it('filters subscriptions by status', async () => {
    const { body } = await get('/api/subscriptions?status=arrears');
    expect(body.items.every((s: { status: string }) => s.status === 'arrears')).toBe(true);
  });
  it('payments list excludes test rows and includes card_last4', async () => {
    const { body } = await get('/api/payments');
    expect(body.items.length).toBe(3);
    expect(body.items.some((p: { card_last4: string }) => p.card_last4 === '4242')).toBe(true);
  });
});

describe('leads & arrears', () => {
  it('lists leads and filters by stage', async () => {
    const { body } = await get('/api/leads?stage=lost');
    expect(body.items.every((l: { stage: string }) => l.stage === 'lost')).toBe(true);
  });
  it('lead detail 404s for an unknown id', async () => {
    const { status } = await get('/api/leads/00000000-0000-4000-8000-000000000099');
    expect(status).toBe(404);
  });
  it('arrears surfaces the overdue subscription with days_overdue and stage', async () => {
    const { body } = await get('/api/arrears');
    expect(body.items.length).toBe(1);
    expect(body.items[0].stage).toBe('firm');
    expect(Number(body.items[0].amount.amount_minor)).toBeGreaterThan(0);
  });
});

describe('devices', () => {
  it('sites summary counts are internally consistent', async () => {
    const { body } = await get('/api/devices/sites');
    const rbm = body.items.find((s: { short_code: string }) => s.short_code === 'RBM');
    expect(rbm.device_counts.total).toBe(rbm.device_counts.good + rbm.device_counts.watch + rbm.device_counts.bad + rbm.device_counts.unknown);
  });
  it('builds a gateway → hub → lock tree for a site', async () => {
    const sites = (await get('/api/devices/sites')).body.items;
    const rbm = sites.find((s: { short_code: string }) => s.short_code === 'RBM');
    const { body } = await get(`/api/devices/sites/${rbm.site_id}`);
    expect(body.tree[0].kind).toBe('gateway');
    expect(body.tree[0].children.length).toBeGreaterThan(0);
    expect(body.tree[0].children[0].kind).toBe('hub');
    expect(body.tree[0].children[0].children[0].kind).toBe('lock');
  });
  it('device detail resolves its unit link for a lock', async () => {
    const sites = (await get('/api/devices/sites')).body.items;
    const rbm = sites.find((s: { short_code: string }) => s.short_code === 'RBM');
    const tree = (await get(`/api/devices/sites/${rbm.site_id}`)).body.tree;
    const lock = tree[0].children[0].children[0];
    const { body } = await get(`/api/devices/${lock.id}`);
    expect(body.unit).toBeTruthy();
  });
});

describe('import diagnostics', () => {
  it('modules reports legacy and core counts for the loaded fixture', async () => {
    const { body } = await get('/api/import/modules');
    const facilities = body.items.find((m: { legacy_table: string }) => m.legacy_table === 'facilities');
    expect(facilities.legacy_rows).toBeGreaterThan(0);
    expect(facilities.core_rows).toBe(facilities.legacy_rows);
  });
  it('market-sources reports a distribution, not raw rows', async () => {
    const { body } = await get('/api/import/market-sources');
    const contacts = body.items.find((m: { table: string }) => m.table === 'contacts');
    expect(Object.values(contacts.by_source).some((n) => (n as number) > 0)).toBe(true);
  });
  it('runs + checks: the fixture load run is validated with zero failing checks', async () => {
    const runs = (await get('/api/import/runs?limit=5')).body.items;
    expect(runs[0].status).toBe('validated');
    const checks = (await get(`/api/import/runs/${runs[0].id}/checks`)).body.items;
    expect(checks.some((c: { name: string }) => c.name.includes('rows'))).toBe(true);
    expect(checks.filter((c: { severity: string; passed: boolean }) => c.severity === 'error').every((c: { passed: boolean }) => c.passed)).toBe(true);
  });
});
