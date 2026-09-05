import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { createTestDatabase } from './helpers/db.js';

let db: Awaited<ReturnType<typeof createTestDatabase>>;
let app: Awaited<ReturnType<typeof buildApp>>;
const FXSA = '00000000-0000-4000-8000-00000000005a';
const FXNO = '00000000-0000-4000-8000-00000000004e';

beforeAll(async () => {
  db = await createTestDatabase();
  app = await buildApp({ databaseUrl: db.appDsn, devAuth: true, logger: false });
});
afterAll(async () => {
  await app.close();
  await db.drop();
});

describe('health', () => {
  it('answers with a request id', async () => {
    const r = await app.inject({ url: '/health' });
    expect(r.statusCode).toBe(200);
    expect(r.json().ok).toBe(true);
    expect(r.headers['x-request-id']).toBeTruthy();
  });
});

describe('/api/me', () => {
  it('rejects anonymous callers', async () => {
    const r = await app.inject({ url: '/api/me' });
    expect(r.statusCode).toBe(401);
  });
  it('gives the org admin all three tenants', async () => {
    const r = await app.inject({ url: '/api/me', headers: { 'x-dev-user': 'geir@flexistore.no' } });
    expect(r.statusCode).toBe(200);
    const body = r.json();
    expect(body.user.is_org_admin).toBe(true);
    expect(body.memberships.map((m: { slug: string }) => m.slug).sort()).toEqual(['fxfi', 'fxno', 'fxsa']);
    expect(body.scope.all).toBe(true);
  });
  it('narrows scope with X-Tenant and returns tenant currency/locale', async () => {
    const r = await app.inject({ url: '/api/me', headers: { 'x-dev-user': 'geir@flexistore.no', 'x-tenant': 'fxno' } });
    const body = r.json();
    expect(body.scope.tenant_ids).toEqual([FXNO]);
    expect(body.scope.selected.currency).toBe('NOK');
    expect(body.scope.selected.locale).toBe('nb-NO');
  });
  it('refuses a tenant the user is not a member of', async () => {
    // adam is "Manager South Africa" in the fixture → fxsa only
    const ok = await app.inject({ url: '/api/me', headers: { 'x-dev-user': 'adam@flexistore.co.za', 'x-tenant': 'fxsa' } });
    expect(ok.statusCode).toBe(200);
    expect(ok.json().memberships.map((m: { slug: string }) => m.slug)).toEqual(['fxsa']);
    const no = await app.inject({ url: '/api/me', headers: { 'x-dev-user': 'adam@flexistore.co.za', 'x-tenant': 'fxfi' } });
    expect(no.statusCode).toBe(403);
  });
  it('a single-tenant user gets that tenant selected by default', async () => {
    const r = await app.inject({ url: '/api/me', headers: { 'x-dev-user': 'adam@flexistore.co.za' } });
    expect(r.json().scope.all).toBe(false);
    expect(r.json().scope.selected.slug).toBe('fxsa');
  });
  it('is 404 for an unknown route under /api without leaking scope errors first', async () => {
    const r = await app.inject({ url: '/api/nope', headers: { 'x-dev-user': 'geir@flexistore.no' } });
    expect(r.statusCode).toBe(404);
  });
});

describe('row-level security through the app pool', () => {
  it('a request scoped to fxno cannot see fxsa customers, and vice versa', async () => {
    const fxnoCount = await app.db.scoped({ userId: '00000000-0000-4000-8000-000000000000', tenantIds: [FXNO] }, async (c) => {
      const r = await c.query('select count(*)::int as n from customers');
      return r.rows[0].n as number;
    });
    const fxsaCount = await app.db.scoped({ userId: '00000000-0000-4000-8000-000000000000', tenantIds: [FXSA] }, async (c) => {
      const r = await c.query('select count(*)::int as n from customers');
      return r.rows[0].n as number;
    });
    expect(fxnoCount).toBe(1);
    expect(fxsaCount).toBe(4); // 3 contacts + the orphan placeholder
  });
  it('the app role cannot bypass RLS', async () => {
    const n = await app.db.scoped({ userId: '00000000-0000-4000-8000-000000000000', tenantIds: [] }, async (c) => {
      const r = await c.query('select count(*)::int as n from legacy.contacts');
      return r.rows[0].n as number;
    });
    expect(n).toBe(0);
  });
});
