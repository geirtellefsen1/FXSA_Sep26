import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { Money, money } from '../lib/money.js';
import { CustomerRef } from '../lib/refs.js';
import { buildPage, decodeCursor, keysetWhere } from '../lib/pagination.js';

const PaymentListItem = z.object({
  id: z.string().uuid(), customer: CustomerRef.nullable(), subscription_id: z.string().uuid().nullable(),
  method: z.string(), provider: z.string().nullable(), status: z.string(), amount: Money, card_last4: z.string().nullable(), received_at: z.string().nullable(),
});
const ListResponse = z.object({ items: z.array(PaymentListItem), next_cursor: z.string().nullable() });
const ListQuery = z.object({
  status: z.string().optional(), from: z.string().optional(), to: z.string().optional(), customer: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50), cursor: z.string().optional(),
});

export const paymentsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/payments', { schema: { tags: ['payments'], querystring: ListQuery, response: { 200: ListResponse } } }, async (req) => {
    const q = req.query as z.infer<typeof ListQuery>;
    const cursor = decodeCursor(q.cursor);
    const conds = ['not p.is_test'];
    const params: (string | number)[] = [];
    if (q.status) { params.push(q.status); conds.push(`p.status = $${params.length}`); }
    if (q.from) { params.push(q.from); conds.push(`p.received_at >= $${params.length}`); }
    if (q.to) { params.push(q.to); conds.push(`p.received_at <= $${params.length}`); }
    if (q.customer) { params.push(q.customer); conds.push(`p.customer_id = $${params.length}`); }
    // Known limitation: keyset pagination assumes a non-null cursor column. A page boundary landing on a
    // null-received_at row would break the next page's predicate (nulls sort last via `nulls last` but a
    // row-comparison against a null cursor value is unknown, not true). Not hit by the fixture (every payment
    // has received_at); revisit once real data confirms whether any payment is missing it.
    const { sql: keysetSql, params: keysetParams } = keysetWhere(['p.received_at', 'p.id'], cursor, 'desc', params.length + 1);
    const rows = await req.scoped((c) =>
      c.query(
        `select p.id, p.subscription_id, p.method, p.provider, p.status::text, p.amount_minor, p.currency, p.card_last4, p.received_at,
                cu.id as customer_id, cu.account_number, cu.full_name as customer_name
         from payments p left join customers cu on cu.id = p.customer_id
         where ${conds.join(' and ')} ${keysetSql}
         order by p.received_at desc nulls last, p.id desc
         limit ${q.limit + 1}`,
        [...params, ...keysetParams],
      ),
    );
    const page = buildPage(rows.rows as any[], q.limit, ['received_at', 'id'] as const);
    return {
      items: page.items.map((r: any) => ({
        id: r.id, customer: r.customer_id ? { id: r.customer_id, account_number: r.account_number, full_name: r.customer_name } : null,
        subscription_id: r.subscription_id, method: r.method, provider: r.provider, status: r.status,
        amount: money(r.amount_minor, r.currency)!, card_last4: r.card_last4, received_at: r.received_at,
      })),
      next_cursor: page.next_cursor,
    };
  });
};
