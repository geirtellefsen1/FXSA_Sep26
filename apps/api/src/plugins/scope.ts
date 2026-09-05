import fp from 'fastify-plugin';
import type { FastifyRequest } from 'fastify';
import type pg from 'pg';
import { AuthError, resolvePrincipal, selectScope, type Membership, type Principal } from '../auth.js';
import type { Db } from '../db.js';

declare module 'fastify' {
  interface FastifyRequest {
    principal: Principal;
    scope: { tenantIds: string[]; selected: Membership | null; all: boolean };
    /** Run a callback inside a transaction scoped to this request's tenants (RLS). */
    scoped<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T>;
  }
}

/** Everything under /api (except openapi and health) is authenticated and tenant-scoped. */
type ScopeOptions = { db: Db; devAuth: boolean };

export const scopePlugin = fp<ScopeOptions>(async (app, opts) => {
  app.decorateRequest('principal', null as unknown as Principal);
  app.decorateRequest('scope', null as unknown as FastifyRequest['scope']);
  app.decorateRequest('scoped', undefined as unknown as FastifyRequest['scoped']);
  app.addHook('onRequest', async (req) => {
    if (!req.url.startsWith('/api/') || req.url.startsWith('/api/openapi')) return;
    const principal = await resolvePrincipal(opts.db, req, opts.devAuth);
    const scope = selectScope(principal, req.headers['x-tenant'] as string | undefined);
    req.principal = principal;
    req.scope = scope;
    req.scoped = (fn) => opts.db.scoped({ userId: principal.user.id, tenantIds: scope.tenantIds }, fn);
  });
  app.setErrorHandler((err: unknown, req, reply) => {
    if (err instanceof AuthError) return reply.code(err.statusCode).send({ error: err.message, request_id: req.id });
    const e = err as { statusCode?: number; message?: string };
    const status = e.statusCode ?? 500;
    if (status >= 500) req.log.error({ err }, 'unhandled');
    return reply.code(status).send({ error: status >= 500 ? 'internal error' : (e.message ?? 'error'), request_id: req.id });
  });
});
