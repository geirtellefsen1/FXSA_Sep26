import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { Money, money } from '../lib/money.js';
import { SiteRef, UnitRef } from '../lib/refs.js';
import { buildPage, decodeCursor, keysetWhere } from '../lib/pagination.js';
import { NotFound } from '../lib/errors.js';

const CustomerListItem = z.object({
  id: z.string().uuid(), account_number: z.string().nullable(), kind: z.string(), full_name: z.string().nullable(),
  email: z.string().nullable(), phone: z.string().nullable(), status: z.string(), kyc_status: z.string(),
  flags: z.record(z.string(), z.unknown()), customer_since: z.string().nullable(), tags: z.array(z.string()),
});
const CustomersListResponse = z.object({ items: z.array(CustomerListItem), next_cursor: z.string().nullable() });
const ListQuery = z.object({
  q: z.string().optional(), site: z.string().uuid().optional(), status: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50), cursor: z.string().optional(),
});

export const customersRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/customers', { schema: { tags: ['customers'], summary: 'Search across name, email, phone, account number', querystring: ListQuery, response: { 200: CustomersListResponse } } }, async (req) => {
    const q = req.query as z.infer<typeof ListQuery>;
    const cursor = decodeCursor(q.cursor);
    const conds: string[] = ['c.deleted_at is null'];
    const params: (string | number)[] = [];
    if (q.q) {
      params.push(`%${q.q}%`);
      conds.push(`(c.full_name ilike $${params.length} or c.email ilike $${params.length} or c.phone ilike $${params.length} or c.account_number ilike $${params.length})`);
    }
    if (q.status) { params.push(q.status); conds.push(`c.status = $${params.length}`); }
    if (q.site) { params.push(q.site); conds.push(`exists (select 1 from subscriptions s where s.customer_id = c.id and s.site_id = $${params.length})`); }
    const { sql: keysetSql, params: keysetParams } = keysetWhere(['c.full_name', 'c.id'], cursor, 'asc', params.length + 1);
    const rows = await req.scoped((c) =>
      c.query(
        `select c.id, c.account_number, c.kind::text, c.full_name, c.email, c.phone, c.status::text, c.kyc_status::text, c.flags, c.customer_since,
                coalesce((select array_agg(t.name order by t.name) from customer_tags ct join tags t on t.id = ct.tag_id where ct.customer_id = c.id), '{}') as tags
         from customers c
         where ${conds.join(' and ')} ${keysetSql}
         order by c.full_name asc, c.id asc
         limit ${q.limit + 1}`,
        [...params, ...keysetParams],
      ),
    );
    const page = buildPage(rows.rows as any[], q.limit, ['full_name', 'id'] as const);
    return { items: page.items.map((r: any) => ({ ...r, customer_since: r.customer_since ?? null, tags: r.tags ?? [] })), next_cursor: page.next_cursor };
  });

  const Subscription360 = z.object({
    id: z.string().uuid(), unit: UnitRef, site: SiteRef, price: Money, status: z.string(),
    started_at: z.string().nullable(), ends_at: z.string().nullable(), next_bill_at: z.string().nullable(), billing_day: z.number().int().nullable(),
  });
  const Payment360 = z.object({ id: z.string().uuid(), method: z.string(), status: z.string(), amount: Money, received_at: z.string().nullable() });
  const Message360 = z.object({ id: z.string().uuid(), channel: z.string(), direction: z.string(), sent_at: z.string(), subject: z.string().nullable(), snippet: z.string().nullable() });
  const Note360 = z.object({ id: z.string().uuid(), body_md: z.string(), author_kind: z.string(), pinned: z.boolean(), created_at: z.string() });
  const Document360 = z.object({ id: z.string().uuid(), kind: z.string(), name: z.string(), url: z.string().nullable(), uploaded_at: z.string() });
  const Customer360 = z.object({
    customer: z.record(z.string(), z.unknown()),
    subscriptions: z.array(Subscription360),
    recent_payments: z.array(Payment360),
    recent_messages: z.array(Message360),
    tags: z.array(z.string()),
    notes: z.array(Note360),
    documents: z.array(Document360),
  });
  app.get('/api/customers/:id', { schema: { tags: ['customers'], params: z.object({ id: z.string().uuid() }), response: { 200: Customer360, 404: NotFound } } }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const out = await req.scoped(async (c) => {
      const cust = await c.query('select * from customers where id = $1', [id]);
      const custRow = cust.rows[0];
      if (!custRow) return null;
      const subs = await c.query(
        `select s.id, s.status::text, s.started_at, s.ends_at, s.next_bill_at, s.billing_day, s.price_minor, s.currency,
                u.id as unit_id, u.number as unit_number, u.display_name as unit_display_name,
                st.id as site_id, st.name as site_name, st.short_code as site_short_code
         from subscriptions s join units u on u.id = s.unit_id join sites st on st.id = s.site_id
         where s.customer_id = $1 order by s.started_at desc`,
        [id],
      );  // custRow narrows `cust` above; nothing else here indexes rows[0] without a guard
      const payments = await c.query(
        `select id, method, status::text, amount_minor, currency, received_at from payments where customer_id = $1 order by received_at desc nulls last limit 10`,
        [id],
      );
      const conv = await c.query('select id from conversations where customer_id = $1', [id]);
      const messages = conv.rows[0]
        ? await c.query(
            `select id, channel::text, direction, sent_at, subject, left(coalesce(body,''), 160) as snippet from messages where conversation_id = $1 order by sent_at desc limit 5`,
            [(conv.rows[0] as any).id],
          )
        : { rows: [] as any[] };
      const tags = await c.query('select t.name from customer_tags ct join tags t on t.id = ct.tag_id where ct.customer_id = $1 order by t.name', [id]);
      const notes = await c.query('select id, body_md, author_kind::text, pinned, created_at from notes where target_kind = $1 and target_id = $2 and deleted_at is null order by pinned desc, created_at desc', ['customer', id]);
      const docs = await c.query('select id, kind, name, url, uploaded_at from documents where target_kind = $1 and target_id = $2 order by uploaded_at desc', ['customer', id]);
      return { customer: custRow, subs: subs.rows, payments: payments.rows, messages: messages.rows, tags: tags.rows, notes: notes.rows, docs: docs.rows };
    });
    if (!out) return reply.code(404).send({ error: 'customer not found', request_id: req.id });
    return {
      customer: out.customer,
      subscriptions: (out.subs as any[]).map((s) => ({
        id: s.id, unit: { id: s.unit_id, number: s.unit_number, display_name: s.unit_display_name }, site: { id: s.site_id, name: s.site_name, short_code: s.site_short_code },
        price: money(s.price_minor, s.currency)!, status: s.status, started_at: s.started_at, ends_at: s.ends_at, next_bill_at: s.next_bill_at, billing_day: s.billing_day,
      })),
      recent_payments: (out.payments as any[]).map((p) => ({ id: p.id, method: p.method, status: p.status, amount: money(p.amount_minor, p.currency)!, received_at: p.received_at })),
      recent_messages: (out.messages as any[]).map((m) => ({ id: m.id, channel: m.channel, direction: m.direction, sent_at: m.sent_at, subject: m.subject, snippet: m.snippet })),
      tags: (out.tags as any[]).map((t) => t.name),
      notes: out.notes as any,
      documents: out.docs as any,
    };
  });

  const TimelineQuery = z.object({ from: z.string().optional(), to: z.string().optional(), kind: z.string().optional(), limit: z.coerce.number().int().min(1).max(200).default(50), cursor: z.string().optional() });
  const TimelineRow = z.object({ id: z.string().uuid(), ts: z.string(), actor_kind: z.string(), action: z.string(), summary: z.string().nullable(), severity: z.string().nullable(), payload: z.record(z.string(), z.unknown()) });
  const TimelineResponse = z.object({ items: z.array(TimelineRow), next_cursor: z.string().nullable() });
  app.get('/api/customers/:id/timeline', { schema: { tags: ['customers'], params: z.object({ id: z.string().uuid() }), querystring: TimelineQuery, response: { 200: TimelineResponse } } }, async (req) => {
    const { id } = req.params as { id: string };
    const q = req.query as z.infer<typeof TimelineQuery>;
    const cursor = decodeCursor(q.cursor);
    const conds = ['customer_id = $1'];
    const params: (string | number)[] = [id];
    if (q.from) { params.push(q.from); conds.push(`ts >= $${params.length}`); }
    if (q.to) { params.push(q.to); conds.push(`ts <= $${params.length}`); }
    if (q.kind) { params.push(`${q.kind}%`); conds.push(`action like $${params.length}`); }
    const { sql: keysetSql, params: keysetParams } = keysetWhere(['ts', 'id'], cursor, 'desc', params.length + 1);
    const rows = await req.scoped((c) =>
      c.query(`select id, ts, actor_kind::text, action, summary, severity, payload from activity_log where ${conds.join(' and ')} ${keysetSql} order by ts desc, id desc limit ${q.limit + 1}`, [...params, ...keysetParams]),
    );
    const page = buildPage(rows.rows as any[], q.limit, ['ts', 'id'] as const);
    return { items: page.items, next_cursor: page.next_cursor };
  });

  const LegacyResponse = z.union([
    z.object({ available: z.literal(false) }),
    z.object({
      available: z.literal(true), contact: z.record(z.string(), z.unknown()),
      counts: z.object({ reservations: z.number().int(), payments: z.number().int(), communications: z.number().int() }),
    }),
  ]);
  app.get('/api/customers/:id/legacy', { schema: { tags: ['customers'], params: z.object({ id: z.string().uuid() }), response: { 200: LegacyResponse, 404: NotFound } } }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const out = await req.scoped(async (c) => {
      const cust = await c.query<{ source: string | null; source_ref: string | null }>('select source, source_ref from customers where id = $1', [id]);
      const custRow = cust.rows[0];
      if (!custRow) return undefined;
      if (custRow.source !== 'zoho' || !custRow.source_ref) return null;
      const zohoId = custRow.source_ref;
      const contact = await c.query('select * from legacy.contacts where zoho_id = $1', [zohoId]);
      const contactRow = contact.rows[0];
      if (!contactRow) return null;
      // Sequential, not Promise.all: node-postgres pipelines concurrent queries on one client via an internal
      // queue that is deprecated (and slated for removal) — issue one at a time on a shared PoolClient.
      const res = await c.query<{ n: string }>('select count(*) as n from legacy.reservations where contact_zoho_id = $1', [zohoId]);
      const pay = await c.query<{ n: string }>('select count(*) as n from legacy.payments where contact_zoho_id = $1', [zohoId]);
      const comm = await c.query<{ n: string }>('select count(*) as n from legacy.communications where contact_zoho_id = $1', [zohoId]);
      return { contact: contactRow, counts: { reservations: Number(res.rows[0]!.n), payments: Number(pay.rows[0]!.n), communications: Number(comm.rows[0]!.n) } };
    });
    if (out === undefined) return reply.code(404).send({ error: 'customer not found', request_id: req.id });
    if (out === null) return { available: false as const };
    return { available: true as const, contact: out.contact, counts: out.counts };
  });
};
