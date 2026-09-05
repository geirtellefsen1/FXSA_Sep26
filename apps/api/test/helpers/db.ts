/**
 * Test database: a scratch database per test run, migrations + seed applied with db/apply.sh, importer fixture loaded.
 * Needs: psql on PATH, python3 with psycopg, and an admin DSN (default postgresql://fx:fx@localhost:5432/postgres).
 */
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import pg from 'pg';

const REPO = path.resolve(import.meta.dirname, '../../../..');
const ADMIN = process.env.TEST_ADMIN_DSN ?? 'postgresql://fx:fx@localhost:5432/postgres';

export async function createTestDatabase(): Promise<{ adminDsn: string; appDsn: string; name: string; drop: () => Promise<void> }> {
  const name = `fxpms_test_${randomBytes(4).toString('hex')}`;
  const admin = new pg.Client({ connectionString: ADMIN });
  await admin.connect();
  await admin.query(`create database ${name}`);
  await admin.end();
  const adminUrl = new URL(ADMIN);
  adminUrl.pathname = `/${name}`;
  const adminDsn = adminUrl.toString();
  execFileSync('bash', [path.join(REPO, 'db/apply.sh')], { env: { ...process.env, DSN: adminDsn, APP_DB_PASSWORD: 'app' }, stdio: 'pipe' });
  const tools = path.join(REPO, 'tools/zoho-import');
  execFileSync('python3', ['tests/make_fixture.py', 'tests/fixture/Data_001'], { cwd: tools, stdio: 'pipe' });
  execFileSync('python3', ['-m', 'zoho_import.cli', '--dsn', adminDsn, 'run', '--root', 'tests/fixture/Data_001', '--refresh-manifest'], { cwd: tools, stdio: 'pipe' });
  const appUrl = new URL(adminDsn);
  appUrl.username = 'app_user';
  appUrl.password = 'app';
  return {
    adminDsn,
    appDsn: appUrl.toString(),
    name,
    drop: async () => {
      const c = new pg.Client({ connectionString: ADMIN });
      await c.connect();
      await c.query(`drop database if exists ${name} with (force)`);
      await c.end();
    },
  };
}
