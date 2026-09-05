import type { FastifyRequest } from 'fastify';
import type { Db } from './db.js';

export type Membership = { tenant_id: string; slug: string; name: string; role: string; currency: string; locale: string; timezone: string; country: string };
export type Principal = {
  user: { id: string; email: string; full_name: string | null; is_org_admin: boolean; org_id: string | null };
  memberships: Membership[];
};

export class AuthError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
  }
}

/**
 * Resolve the caller. Development: the X-Dev-User header carries an email. Production: replaced by sessions (Sprint 2, Day 7).
 * The lookup uses auth.resolve_user(), a security-definer function, because the caller has no RLS scope yet.
 */
export async function resolvePrincipal(db: Db, req: FastifyRequest, devAuth: boolean): Promise<Principal> {
  const email = devAuth ? (req.headers['x-dev-user'] as string | undefined) : undefined;
  if (!email) throw new AuthError(401, 'not authenticated');
  return db.unscoped(async (c) => {
    const r = await c.query<{ user_json: Principal['user']; memberships: Membership[] }>(
      'select user_json, memberships from auth.resolve_user($1)',
      [email.toLowerCase()],
    );
    const row = r.rows[0];
    if (!row || !row.user_json) throw new AuthError(401, 'unknown user');
    return { user: row.user_json, memberships: row.memberships ?? [] };
  });
}

/**
 * Pick the tenant scope for this request from X-Tenant (slug or "all"). Membership decides; org admins may use "all".
 */
export function selectScope(p: Principal, requested: string | undefined): { tenantIds: string[]; selected: Membership | null; all: boolean } {
  const slug = (requested ?? '').trim().toLowerCase();
  if (p.memberships.length === 0) throw new AuthError(403, 'user has no tenant memberships');
  if (slug === '' || slug === 'all') {
    if (slug === 'all' && !p.user.is_org_admin && p.memberships.length > 1) {
      // tenant staff with several memberships still get all of them; "all" is only refused when it would widen scope
    }
    if (slug === '' && p.memberships.length === 1) {
      const m = p.memberships[0]!;
      return { tenantIds: [m.tenant_id], selected: m, all: false };
    }
    return { tenantIds: p.memberships.map((m) => m.tenant_id), selected: null, all: true };
  }
  const m = p.memberships.find((x) => x.slug === slug);
  if (!m) throw new AuthError(403, `not a member of tenant '${slug}'`);
  return { tenantIds: [m.tenant_id], selected: m, all: false };
}
