import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { Money, money } from '../lib/money.js';
import { buildPage, decodeCursor, keysetWhere } from '../lib/pagination.js';
import { NotFound } from '../lib/errors.js';

const DeviceCounts = z.object({ total: z.number().int(), good: z.number().int(), watch: z.number().int(), bad: z.number().int(), unknown: z.number().int() });

const SiteListItem = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  short_code: z.string(),
  name: z.string(),
  city: z.string().nullable(),
  region: z.string().nullable(),
  country: z.string().nullable(),
  currency: z.string().length(3),
  status: z.string(),
  landlord: z.object({ id: z.string().uuid(), name: z.string() }).nullable(),
  unit_counts: z.object({ total: z.number().int(), occupied: z.number().int(), available: z.number().int(), reserved: z.number().int(), maintenance: z.number().int() }),
  occupancy_pct: z.number().nullable(),
  mrr: Money,
  device_counts: DeviceCounts,
});
export const SitesListResponse = z.object({ items: z.array(SiteListItem), next_cursor: z.string().nullable() });

const ListQuery = z.object({ limit: z.coerce.number().int().min(1).max(100).default(50), cursor: z.string().optional() });

async function deviceCounts(c: { query: (sql: string, params?: unknown[]) => Promise<{ rows: { status: string; n: string }[] }> }, siteId: string) {
  const r = await c.query(
    `select status::text, count(*) as n from devices where site_id = $1 and kind in ('udm','gateway','hub') and deleted_at is null group by 1`,
    [siteId],
  );
  const counts = { total: 0, good: 0, watch: 0, bad: 0, unknown: 0 };
  for (const row of r.rows) {
    const n = Number(row.n);
    counts.total += n;
    if (row.status in counts) {
      const rec = counts as Record<string, number>;
      rec[row.status] = (rec[row.status] ?? 0) + n;
    }
  }
  return counts;
}

export const sitesRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/sites', { schema: { tags: ['sites'], summary: 'Sites (facilities), one card per site', querystring: ListQuery, response: { 200: SitesListResponse } } }, async (req) => {
    const q = req.query as z.infer<typeof ListQuery>;
    const cursor = decodeCursor(q.cursor);
    const { sql: keysetSql, params: keysetParams } = keysetWhere(['o.name', 'o.site_id'], cursor, 'asc', 1);
    const rows = await req.scoped(async (c) => {
      const r = await c.query(
        `select o.site_id as id, s.slug, s.short_code, o.name, s.city, s.region, s.country, s.currency, s.status,
                l.id as landlord_id, l.name as landlord_name,
                o.units_total, o.units_occupied, o.units_available, o.units_reserved, o.units_maintenance, o.occupancy_pct, o.mrr_minor
         from v_site_occupancy o
         join sites s on s.id = o.site_id
         left join landlords l on l.id = s.landlord_id
         where true ${keysetSql}
         order by o.name asc, o.site_id asc
         limit ${q.limit + 1}`,
        keysetParams,
      );
      const withDevices = [];
      for (const row of r.rows as any[]) {
        withDevices.push({ ...row, devices: await deviceCounts(c, row.id) });
      }
      return withDevices;
    });
    const page = buildPage(rows, q.limit, ['name', 'id'] as const);
    return {
      items: page.items.map((r: any) => ({
        id: r.id, slug: r.slug, short_code: r.short_code, name: r.name, city: r.city, region: r.region, country: r.country,
        currency: r.currency, status: r.status,
        landlord: r.landlord_id ? { id: r.landlord_id, name: r.landlord_name } : null,
        unit_counts: { total: Number(r.units_total), occupied: Number(r.units_occupied), available: Number(r.units_available), reserved: Number(r.units_reserved), maintenance: Number(r.units_maintenance) },
        occupancy_pct: r.occupancy_pct == null ? null : Number(r.occupancy_pct),
        mrr: money(r.mrr_minor, r.currency)!,
        device_counts: r.devices,
      })),
      next_cursor: page.next_cursor,
    };
  });

  const SiteDetailResponse = z.object({
    site: z.record(z.string(), z.unknown()),
    zones: z.array(z.record(z.string(), z.unknown())),
    unit_types: z.array(z.record(z.string(), z.unknown())),
    agreements: z.array(z.record(z.string(), z.unknown())),
    landlord: z.record(z.string(), z.unknown()).nullable(),
    device_counts: DeviceCounts,
  });
  app.get('/api/sites/:id', { schema: { tags: ['sites'], params: z.object({ id: z.string().uuid() }), response: { 200: SiteDetailResponse, 404: NotFound } } }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const out = await req.scoped(async (c) => {
      const site = await c.query('select * from sites where id = $1', [id]);
      const siteRow = site.rows[0];
      if (!siteRow) return null;
      const zones = await c.query('select * from zones where site_id = $1 order by code', [id]);
      const unitTypes = await c.query('select * from unit_types where site_id = $1 order by name', [id]);
      const agreements = await c.query('select * from site_agreements where site_id = $1 order by created_at desc', [id]);
      const landlordId = (siteRow as any).landlord_id as string | null;
      const landlord = landlordId ? await c.query('select * from landlords where id = $1', [landlordId]) : null;
      const devices = await deviceCounts(c, id);
      return { site: siteRow, zones: zones.rows, unit_types: unitTypes.rows, agreements: agreements.rows, landlord: landlord?.rows[0] ?? null, device_counts: devices };
    });
    if (!out) return reply.code(404).send({ error: 'site not found', request_id: req.id });
    return out;
  });

  const UnitListItem = z.object({
    id: z.string().uuid(), number: z.string(), display_name: z.string().nullable(), size_value: z.string().nullable(), size_unit: z.string().nullable(),
    tier: z.string(), status: z.string(), status_detail: z.string().nullable(), unit_type_name: z.string().nullable(),
    listed_price: Money.nullable(), current_subscription_id: z.string().uuid().nullable(),
  });
  const UnitsListResponse = z.object({ items: z.array(UnitListItem), next_cursor: z.string().nullable() });
  app.get('/api/sites/:id/units', { schema: { tags: ['sites'], params: z.object({ id: z.string().uuid() }), querystring: ListQuery, response: { 200: UnitsListResponse } } }, async (req) => {
    const { id } = req.params as { id: string };
    const q = req.query as z.infer<typeof ListQuery>;
    const cursor = decodeCursor(q.cursor);
    const { sql: keysetSql, params: keysetParams } = keysetWhere(['u.number', 'u.id'], cursor, 'asc', 2);
    const rows = await req.scoped((c) =>
      c.query(
        `select u.id, u.number, u.display_name, u.size_value, u.size_unit, u.tier::text, u.status::text, u.status_detail,
                ut.name as unit_type_name, u.listed_price_minor, u.currency, u.current_subscription_id
         from units u left join unit_types ut on ut.id = u.unit_type_id
         where u.site_id = $1 and u.deleted_at is null ${keysetSql}
         order by u.number asc, u.id asc
         limit ${q.limit + 1}`,
        [id, ...keysetParams],
      ),
    );
    const page = buildPage(rows.rows as any[], q.limit, ['number', 'id'] as const);
    return {
      items: page.items.map((r: any) => ({
        id: r.id, number: r.number, display_name: r.display_name, size_value: r.size_value, size_unit: r.size_unit,
        tier: r.tier, status: r.status, status_detail: r.status_detail, unit_type_name: r.unit_type_name,
        listed_price: money(r.listed_price_minor, r.currency), current_subscription_id: r.current_subscription_id,
      })),
      next_cursor: page.next_cursor,
    };
  });

  const UnitDetailResponse = z.object({
    unit: z.record(z.string(), z.unknown()),
    site: z.object({ id: z.string().uuid(), name: z.string(), short_code: z.string() }),
    unit_type: z.record(z.string(), z.unknown()).nullable(),
    current_subscription: z.object({ id: z.string().uuid(), customer_id: z.string().uuid(), customer_name: z.string().nullable(), status: z.string() }).nullable(),
    devices: z.object({ hub: z.record(z.string(), z.unknown()).nullable(), gateway: z.record(z.string(), z.unknown()).nullable(), lock: z.record(z.string(), z.unknown()).nullable() }),
  });
  app.get('/api/units/:id', { schema: { tags: ['sites'], params: z.object({ id: z.string().uuid() }), response: { 200: UnitDetailResponse, 404: NotFound } } }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const out = await req.scoped(async (c) => {
      const u = await c.query('select * from units where id = $1', [id]);
      const row = u.rows[0] as any;
      if (!row) return null;
      const site = await c.query('select id, name, short_code from sites where id = $1', [row.site_id]);
      const unitType = row.unit_type_id ? await c.query('select * from unit_types where id = $1', [row.unit_type_id]) : null;
      const sub = row.current_subscription_id
        ? await c.query(`select s.id, s.customer_id, cu.full_name as customer_name, s.status::text from subscriptions s join customers cu on cu.id = s.customer_id where s.id = $1`, [row.current_subscription_id])
        : null;
      const deviceIds = [row.hub_id, row.gateway_id, row.lock_device_id].filter(Boolean);
      const devices = deviceIds.length ? await c.query('select * from devices where id = any($1::uuid[])', [deviceIds]) : { rows: [] as any[] };
      const byId = Object.fromEntries((devices.rows as any[]).map((d) => [d.id, d]));
      return {
        unit: row, site: site.rows[0],
        unit_type: unitType?.rows[0] ?? null,
        current_subscription: sub?.rows[0] ? { id: sub.rows[0].id, customer_id: sub.rows[0].customer_id, customer_name: sub.rows[0].customer_name, status: sub.rows[0].status } : null,
        devices: { hub: byId[row.hub_id] ?? null, gateway: byId[row.gateway_id] ?? null, lock: byId[row.lock_device_id] ?? null },
      };
    });
    if (!out) return reply.code(404).send({ error: 'unit not found', request_id: req.id });
    return out;
  });
};
