import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { Money, money } from '../lib/money.js';
import { CustomerRef, SiteRef, UnitRef } from '../lib/refs.js';
import { buildPage, decodeCursor, keysetWhere } from '../lib/pagination.js';

const SubscriptionListItem = z.object({
  id: z.string().uuid(), customer: CustomerRef, unit: UnitRef, site: SiteRef, status: z.string(),
  price: Money, billing_period: z.string(), billing_day: z.number().int().nullable(),
  started_at: z.string().nullable(), ends_at: z.string().nullable(), next_bill_at: z.string().nullable(),
});
const ListResponse = z.object({ items: z.array(SubscriptionListItem), next_cursor: z.string().nullable() });
const ListQuery = z.object({ status: z.string().optional(), site: z.string().uuid().optional(), customer: z.string().uuid().optional(), limit: z.coerce.number().int().min(1).max(100).default(50), cursor: z.string().optional() });

export const subscriptionsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/subscriptions', { schema: { tags: ['subscriptions'], querystring: ListQuery, response: { 200: ListResponse } } }, async (req) => {
    const q = req.query as z.infer<typeof ListQuery>;
    const cursor = decodeCursor(q.cursor);
    const conds = ['s.deleted_at is null'];
    const params: (string | number)[] = [];
    if (q.status) { params.push(q.status); conds.push(`s.status = $${params.length}`); }
    if (q.site) { params.push(q.site); conds.push(`s.site_id = $${params.length}`); }
    if (q.customer) { params.push(q.customer); conds.push(`s.customer_id = $${params.length}`); }
    const { sql: keysetSql, params: keysetParams } = keysetWhere(['s.started_at', 's.id'], cursor, 'desc', params.length + 1);
    const rows = await req.scoped((c) =>
      c.query(
        `select s.id, s.status::text, s.price_minor, s.currency, s.billing_period, s.billing_day, s.started_at, s.ends_at, s.next_bill_at,
                cu.id as customer_id, cu.account_number, cu.full_name as customer_name,
                u.id as unit_id, u.number as unit_number, u.display_name as unit_display_name,
                st.id as site_id, st.name as site_name, st.short_code as site_short_code
         from subscriptions s join customers cu on cu.id = s.customer_id join units u on u.id = s.unit_id join sites st on st.id = s.site_id
         where ${conds.join(' and ')} ${keysetSql}
         order by s.started_at desc, s.id desc
         limit ${q.limit + 1}`,
        [...params, ...keysetParams],
      ),
    );
    const page = buildPage(rows.rows as any[], q.limit, ['started_at', 'id'] as const);
    return {
      items: page.items.map((r: any) => ({
        id: r.id, customer: { id: r.customer_id, account_number: r.account_number, full_name: r.customer_name },
        unit: { id: r.unit_id, number: r.unit_number, display_name: r.unit_display_name },
        site: { id: r.site_id, name: r.site_name, short_code: r.site_short_code },
        status: r.status, price: money(r.price_minor, r.currency)!, billing_period: r.billing_period, billing_day: r.billing_day,
        started_at: r.started_at, ends_at: r.ends_at, next_bill_at: r.next_bill_at,
      })),
      next_cursor: page.next_cursor,
    };
  });
};
