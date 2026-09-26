import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { Money, money } from '../lib/money.js';
import { buildPage, decodeCursor, keysetWhere } from '../lib/pagination.js';
import { NotFound } from '../lib/errors.js';

const LeadListItem = z.object({
  id: z.string().uuid(), lead_number: z.string().nullable(), name: z.string(), email: z.string().nullable(), phone: z.string().nullable(),
  source: z.string().nullable(), stage: z.string(), site: z.object({ id: z.string().uuid(), name: z.string() }).nullable(),
  value_estimate: Money.nullable(), score: z.number().int().nullable(), is_recurring: z.boolean(), last_touch_at: z.string().nullable(),
});
const ListResponse = z.object({ items: z.array(LeadListItem), next_cursor: z.string().nullable() });
const ListQuery = z.object({ stage: z.string().optional(), site: z.string().uuid().optional(), q: z.string().optional(), limit: z.coerce.number().int().min(1).max(100).default(50), cursor: z.string().optional() });

export const leadsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/leads', { schema: { tags: ['leads'], querystring: ListQuery, response: { 200: ListResponse } } }, async (req) => {
    const q = req.query as z.infer<typeof ListQuery>;
    const cursor = decodeCursor(q.cursor);
    const conds = ['l.deleted_at is null'];
    const params: (string | number)[] = [];
    if (q.stage) { params.push(q.stage); conds.push(`l.stage = $${params.length}`); }
    if (q.site) { params.push(q.site); conds.push(`l.site_id = $${params.length}`); }
    if (q.q) { params.push(`%${q.q}%`); conds.push(`(l.name ilike $${params.length} or l.email ilike $${params.length} or l.phone ilike $${params.length})`); }
    const { sql: keysetSql, params: keysetParams } = keysetWhere(['l.created_at', 'l.id'], cursor, 'desc', params.length + 1);
    const rows = await req.scoped((c) =>
      c.query(
        `select l.id, l.lead_number, l.name, l.email, l.phone, l.source, l.stage::text, l.value_estimate_minor, l.currency,
                l.score, l.is_recurring, l.last_touch_at, s.id as site_id, s.name as site_name
         from leads l left join sites s on s.id = l.site_id
         where ${conds.join(' and ')} ${keysetSql}
         order by l.created_at desc, l.id desc
         limit ${q.limit + 1}`,
        [...params, ...keysetParams],
      ),
    );
    const page = buildPage(rows.rows as any[], q.limit, ['created_at', 'id'] as const);
    return {
      items: page.items.map((r: any) => ({
        id: r.id, lead_number: r.lead_number, name: r.name, email: r.email, phone: r.phone, source: r.source, stage: r.stage,
        site: r.site_id ? { id: r.site_id, name: r.site_name } : null,
        value_estimate: money(r.value_estimate_minor, r.currency), score: r.score, is_recurring: r.is_recurring, last_touch_at: r.last_touch_at,
      })),
      next_cursor: page.next_cursor,
    };
  });

  const LeadDetail = z.object({
    lead: z.record(z.string(), z.unknown()),
    conversation: z.object({ id: z.string().uuid(), last_message_at: z.string().nullable(), unread_count: z.number().int() }).nullable(),
  });
  app.get('/api/leads/:id', { schema: { tags: ['leads'], params: z.object({ id: z.string().uuid() }), response: { 200: LeadDetail, 404: NotFound } } }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const out = await req.scoped(async (c) => {
      const lead = await c.query('select * from leads where id = $1', [id]);
      const leadRow = lead.rows[0];
      if (!leadRow) return null;
      const convId = (leadRow as any).conversation_id as string | null;
      const conv = convId ? await c.query('select id, last_message_at, unread_count from conversations where id = $1', [convId]) : null;
      return { lead: leadRow, conversation: conv?.rows[0] ?? null };
    });
    if (!out) return reply.code(404).send({ error: 'lead not found', request_id: req.id });
    return out;
  });
};
