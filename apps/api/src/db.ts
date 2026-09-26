import pg from 'pg';

const { Pool } = pg;

export type Scope = {
  userId: string;
  tenantIds: string[];
};

export class Db {
  readonly pool: pg.Pool;
  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString, max: 10 });
    // bigint (int8) → number is unsafe above 2^53; money in minor units fits, row counts fit. Keep strings for safety.
    pg.types.setTypeParser(20, (v) => v);
    // timestamptz → ISO UTC string directly, so every route returns times the same way without a conversion step.
    pg.types.setTypeParser(1184, (v) => (v === null ? null : new Date(v).toISOString()));
    // date → keep the raw 'YYYY-MM-DD' text. A date has no timezone; converting it to a JS Date and back risks an
    // off-by-one-day bug depending on the server's local timezone. Pure dates stay dates.
    pg.types.setTypeParser(1082, (v) => v);
  }

  /**
   * Run `fn` inside one transaction whose RLS scope is set with `set_config(..., true)` (transaction-local),
   * so nothing leaks between pooled connections. Every application query must go through here.
   */
  async scoped<T>(scope: Scope, fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      await client.query("select set_config('app.tenant_ids', $1, true), set_config('app.user_id', $2, true)", [
        scope.tenantIds.join(','),
        scope.userId,
      ]);
      const out = await fn(client);
      await client.query('commit');
      return out;
    } catch (e) {
      await client.query('rollback').catch(() => undefined);
      throw e;
    } finally {
      client.release();
    }
  }

  /** Unscoped, for things that are not tenant data (health checks, auth resolution via security-definer functions). */
  async unscoped<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      return await fn(client);
    } finally {
      client.release();
    }
  }

  async close() {
    await this.pool.end();
  }
}
