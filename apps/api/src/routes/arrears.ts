import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { Money, money } from '../lib/money.js';
import { CustomerRef, SiteRef, UnitRef } from '../lib/refs.js';
import { buildPage, decodeCursor, keysetWhere } from '../lib/pagination.js';

const ArrearsItem = z.object({
  subscription_id: z.string().uuid(), customer: CustomerRef, site: SiteRef, unit: UnitRef,
  amount: Money, days_overdue: z.number().int(), stage: z.string(), case_status: z.string(),
});
const ListResponse = z.object({ items: z.array(ArrearsItem), next_cursor: z.string().nullable() });
const ListQuery = z.object({ limit: z.coerce.number().int().min(1).max(100).default(50), cursor: z.string().optional() });

export const arrearsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/arrears', { schema: { tags: ['arrears'], querystring: ListQuery, response: { 200: ListResponse } } }, async (req) => {
    const q = req.query as z.infer<typeof ListQuery>;
    const cursor = decodeCursor(q.cursor);
    const { sql: keysetSql, params: keysetParams } = keysetWhere(['a.amount_minor', 'a.subscription_id'], cursor, 'desc', 1);
    const rows = await req.scoped((c) =>
      c.query(
        `select a.subscription_id, a.amount_minor, s.currency, a.days_overdue, a.stage, a.case_status,
                cu.id as customer_id, cu.account_number, cu.full_name as customer_name,
                st.id as site_id, st.name as site_name, st.short_code as site_short_code,
                u.id as unit_id, u.number as unit_number, u.display_name as unit_display_name
         from v_arrears a
         join subscriptions s on s.id = a.subscription_id
         join customers cu on cu.id = a.customer_id
         join sites st on st.id = a.site_id
         join units u on u.id = a.unit_id
         where true ${keysetSql}
         order by a.amount_minor desc, a.subscription_id desc
         limit ${q.limit + 1}`,
        keysetParams,
      ),
    );
    const page = buildPage(rows.rows as any[], q.limit, ['amount_minor', 'subscription_id'] as const);
    return {
      items: page.items.map((r: any) => ({
        subscription_id: r.subscription_id, customer: { id: r.customer_id, account_number: r.account_number, full_name: r.customer_name },
        site: { id: r.site_id, name: r.site_name, short_code: r.site_short_code }, unit: { id: r.unit_id, number: r.unit_number, display_name: r.unit_display_name },
        amount: money(r.amount_minor, r.currency)!, days_overdue: r.days_overdue, stage: r.stage, case_status: r.case_status,
      })),
      next_cursor: page.next_cursor,
    };
  });
};
