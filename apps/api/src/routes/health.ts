import type { FastifyPluginAsync } from 'fastify';
import type { Db } from '../db.js';

export const healthRoutes: FastifyPluginAsync<{ db: Db }> = async (app, { db }) => {
  app.get('/health', async () => {
    const t0 = Date.now();
    await db.unscoped((c) => c.query('select 1'));
    return { ok: true, db_ms: Date.now() - t0 };
  });
};
