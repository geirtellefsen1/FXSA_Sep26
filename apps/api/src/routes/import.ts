import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { buildPage, decodeCursor, keysetWhere } from '../lib/pagination.js';

// import.runs/checks/files carry no tenant_id column and so have no RLS policy at all (see db/migrations/0005_rls.sql):
// every authenticated user currently sees every tenant's import runs, regardless of X-Tenant scope. That's a real gap,
// not a design choice — there's no role gate yet (writes and roles arrive Sprint 2 Day 6/8). Flagged in docs/sprints/day-3.md
// rather than silently shipped; the fix is a role check (org admin only) once roles exist.
//
// legacy.* tables (used below in /modules and /market-sources) DO carry tenant_id and DO have RLS, so those two
// endpoints are correctly scoped to the caller's tenants via req.scoped() like everything else.

const RunListItem = z.object({ id: z.string().uuid(), kind: z.string(), source_label: z.string().nullable(), started_at: z.string(), finished_at: z.string().nullable(), status: z.string(), error: z.string().nullable() });
const RunsResponse = z.object({ items: z.array(RunListItem), next_cursor: z.string().nullable() });
const ListQuery = z.object({ limit: z.coerce.number().int().min(1).max(100).default(20), cursor: z.string().optional() });

const CheckItem = z.object({ id: z.string().uuid(), stage: z.string(), name: z.string(), expected: z.string().nullable(), actual: z.string().nullable(), passed: z.boolean().nullable(), severity: z.string(), checked_at: z.string() });

// A fixed, curated set of legacy tables (matching tools/zoho-import/zoho_import/validate.py's FULL_BACKUP_EXPECTED
// list) paired with the core table they map into, so /api/import/modules stays bounded and consistent with the
// importer's own reconciliation rather than reporting all ~30 legacy tables including the ones the spec marks
// legacy-only on purpose (property prospects, offer requests, tasks, ...).
const MODULE_MAP: { legacy: string; core: string | null }[] = [
  { legacy: 'facilities', core: 'sites' },
  { legacy: 'units', core: 'units' },
  { legacy: 'contacts', core: 'customers' },
  { legacy: 'reservations', core: 'subscriptions' },
  { legacy: 'payments', core: 'payments' },
  { legacy: 'leads', core: 'leads' },
  { legacy: 'gateways', core: null },
  { legacy: 'business_partners', core: 'landlords' },
  { legacy: 'property_prospects', core: null },
  { legacy: 'offer_requests', core: null },
  { legacy: 'attachments', core: 'documents' },
];

const MARKET_TABLES = ['facilities', 'units', 'contacts', 'reservations', 'payments', 'gateways', 'leads'];

export const importRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/import/runs', { schema: { tags: ['import'], querystring: ListQuery, response: { 200: RunsResponse } } }, async (req) => {
    const q = req.query as z.infer<typeof ListQuery>;
    const cursor = decodeCursor(q.cursor);
    const { sql: keysetSql, params } = keysetWhere(['started_at', 'id'], cursor, 'desc', 1);
    const rows = await req.scoped((c) => c.query(`select id, kind, source_label, started_at, finished_at, status, error from import.runs where true ${keysetSql} order by started_at desc, id desc limit ${q.limit + 1}`, params));
    const page = buildPage(rows.rows as any[], q.limit, ['started_at', 'id'] as const);
    return { items: page.items, next_cursor: page.next_cursor };
  });

  app.get('/api/import/runs/:id/checks', { schema: { tags: ['import'], params: z.object({ id: z.string().uuid() }), response: { 200: z.object({ items: z.array(CheckItem) }) } } }, async (req) => {
    const { id } = req.params as { id: string };
    const rows = await req.scoped((c) => c.query('select id, stage, name, expected, actual, passed, severity, checked_at from import.checks where run_id = $1 order by checked_at', [id]));
    return { items: rows.rows as any[] };
  });

  const ModuleRow = z.object({ legacy_table: z.string(), core_table: z.string().nullable(), legacy_rows: z.number().int(), core_rows: z.number().int().nullable() });
  app.get('/api/import/modules', { schema: { tags: ['import'], summary: "Row counts per module, scoped to the caller's tenants (both legacy and core carry RLS here)", response: { 200: z.object({ items: z.array(ModuleRow) }) } } }, async (req) => {
    const items = await req.scoped(async (c) => {
      const out: z.infer<typeof ModuleRow>[] = [];
      for (const m of MODULE_MAP) {
        const legacy = await c.query<{ n: string }>(`select count(*) as n from legacy.${m.legacy}`);
        const core = m.core ? await c.query<{ n: string }>(`select count(*) as n from ${m.core} where source = 'zoho'`) : null;
        out.push({ legacy_table: m.legacy, core_table: m.core, legacy_rows: Number(legacy.rows[0]!.n), core_rows: core ? Number(core.rows[0]!.n) : null });
      }
      return out;
    });
    return { items };
  });

  const MarketRow = z.object({ table: z.string(), by_source: z.record(z.string(), z.number().int()) });
  app.get('/api/import/market-sources', { schema: { tags: ['import'], summary: "market_source distribution per legacy table, scoped to the caller's tenants", response: { 200: z.object({ items: z.array(MarketRow) }) } } }, async (req) => {
    const items = await req.scoped(async (c) => {
      const out: z.infer<typeof MarketRow>[] = [];
      for (const t of MARKET_TABLES) {
        const r = await c.query<{ market_source: string | null; n: string }>(`select market_source, count(*) as n from legacy.${t} group by 1`);
        const by: Record<string, number> = {};
        for (const row of r.rows) by[row.market_source ?? 'unknown'] = Number(row.n);
        out.push({ table: t, by_source: by });
      }
      return out;
    });
    return { items };
  });
};
