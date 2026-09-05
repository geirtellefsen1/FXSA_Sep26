import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

const Membership = z.object({
  tenant_id: z.string().uuid(),
  slug: z.string(),
  name: z.string(),
  role: z.enum(['super_admin', 'admin', 'manager', 'operator', 'viewer']),
  currency: z.string().length(3),
  locale: z.string(),
  timezone: z.string(),
  country: z.string().length(2),
});

export const MeResponse = z.object({
  user: z.object({ id: z.string().uuid(), email: z.string(), full_name: z.string().nullable(), is_org_admin: z.boolean() }),
  memberships: z.array(Membership),
  scope: z.object({ all: z.boolean(), tenant_ids: z.array(z.string().uuid()), selected: Membership.nullable() }),
});

export const meRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/me', { schema: { tags: ['auth'], summary: 'The caller, their tenant memberships and the scope selected by X-Tenant', response: { 200: MeResponse } } }, async (req) => {
    const { user, memberships } = req.principal;
    return {
      user: { id: user.id, email: user.email, full_name: user.full_name, is_org_admin: user.is_org_admin },
      memberships,
      scope: { all: req.scope.all, tenant_ids: req.scope.tenantIds, selected: req.scope.selected },
    };
  });
};
