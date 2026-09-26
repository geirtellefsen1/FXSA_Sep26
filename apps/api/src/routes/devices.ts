import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { NotFound } from '../lib/errors.js';

const DeviceCounts = z.object({ total: z.number().int(), good: z.number().int(), watch: z.number().int(), bad: z.number().int(), unknown: z.number().int() });
const SiteDeviceSummary = z.object({ site_id: z.string().uuid(), name: z.string(), short_code: z.string(), device_counts: DeviceCounts, gateways: z.number().int() });
const DeviceNode = z.object({
  id: z.string().uuid(), kind: z.string(), name: z.string(), model: z.string().nullable(), status: z.string(),
  last_ping_at: z.string().nullable(), port: z.number().int().nullable(), unit_id: z.string().uuid().nullable(), children: z.array(z.lazy((): z.ZodTypeAny => DeviceNode)),
});
type DeviceNode = z.infer<typeof DeviceNode>;

function tree(rows: any[], parentId: string | null): DeviceNode[] {
  return rows
    .filter((r) => r.parent_id === parentId)
    .map((r) => ({ id: r.id, kind: r.kind, name: r.name, model: r.model, status: r.status, last_ping_at: r.last_ping_at, port: r.port, unit_id: r.unit_id, children: tree(rows, r.id) }));
}

export const devicesRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/devices/sites', { schema: { tags: ['devices'], response: { 200: z.object({ items: z.array(SiteDeviceSummary) }) } } }, async (req) => {
    const rows = await req.scoped((c) =>
      c.query(
        `select s.id as site_id, s.name, s.short_code,
                count(d.*) filter (where d.kind in ('udm','gateway','hub') and d.deleted_at is null) as total,
                count(d.*) filter (where d.kind in ('udm','gateway','hub') and d.status = 'good') as good,
                count(d.*) filter (where d.kind in ('udm','gateway','hub') and d.status = 'watch') as watch,
                count(d.*) filter (where d.kind in ('udm','gateway','hub') and d.status = 'bad') as bad,
                count(d.*) filter (where d.kind in ('udm','gateway','hub') and d.status = 'unknown') as unknown,
                count(d.*) filter (where d.kind = 'gateway') as gateways
         from sites s left join devices d on d.site_id = s.id
         where s.deleted_at is null group by s.id, s.name, s.short_code order by s.name`,
      ),
    );
    return {
      items: (rows.rows as any[]).map((r) => ({
        site_id: r.site_id, name: r.name, short_code: r.short_code,
        device_counts: { total: Number(r.total), good: Number(r.good), watch: Number(r.watch), bad: Number(r.bad), unknown: Number(r.unknown) },
        gateways: Number(r.gateways),
      })),
    };
  });

  app.get('/api/devices/sites/:siteId', { schema: { tags: ['devices'], params: z.object({ siteId: z.string().uuid() }), response: { 200: z.object({ site: z.object({ id: z.string().uuid(), name: z.string() }), tree: z.array(DeviceNode) }), 404: NotFound } } }, async (req, reply) => {
    const { siteId } = req.params as { siteId: string };
    const out = await req.scoped(async (c) => {
      const site = await c.query('select id, name from sites where id = $1', [siteId]);
      const siteRow = site.rows[0];
      if (!siteRow) return null;
      const devices = await c.query('select id, parent_id, kind::text, name, model, status::text, last_ping_at, port, unit_id from devices where site_id = $1 and deleted_at is null order by kind, name', [siteId]);
      return { site: siteRow, devices: devices.rows };
    });
    if (!out) return reply.code(404).send({ error: 'site not found', request_id: req.id });
    return { site: out.site, tree: tree(out.devices as any[], null) };
  });

  const DeviceDetail = z.object({ device: z.record(z.string(), z.unknown()), parent: z.record(z.string(), z.unknown()).nullable(), children: z.array(z.record(z.string(), z.unknown())), unit: z.object({ id: z.string().uuid(), number: z.string() }).nullable() });
  app.get('/api/devices/:id', { schema: { tags: ['devices'], params: z.object({ id: z.string().uuid() }), response: { 200: DeviceDetail, 404: NotFound } } }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const out = await req.scoped(async (c) => {
      const d = await c.query('select * from devices where id = $1', [id]);
      const row = d.rows[0] as any;
      if (!row) return null;
      const parent = row.parent_id ? await c.query('select * from devices where id = $1', [row.parent_id]) : null;
      const children = await c.query('select * from devices where parent_id = $1 order by kind, name', [id]);
      const unit = row.unit_id ? await c.query('select id, number from units where id = $1', [row.unit_id]) : null;
      return { device: row, parent: parent?.rows[0] ?? null, children: children.rows, unit: unit?.rows[0] ?? null };
    });
    if (!out) return reply.code(404).send({ error: 'device not found', request_id: req.id });
    return out;
  });
};
