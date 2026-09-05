# Day 1 — Runtime and API skeleton

**Shipped**

- `docker-compose.yml` (Postgres 16) and `Makefile` (`up`, `down`, `db-apply`, `db-reset`, `import-fixture`, `test`, `dev`, `api`).
- pnpm workspace (`package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, prettier), Node 22.
- `apps/api`: Fastify 5 + `pg` + Zod 4 + `fastify-type-provider-zod` + `@fastify/swagger`.
  - `Db.scoped(scope, fn)`: one transaction per request; `set_config('app.tenant_ids' | 'app.user_id', …, true)` before any query, so RLS scope never leaks between pooled connections.
  - Development auth: `X-Dev-User` (email) + `X-Tenant` (slug or `all`), only outside production. Membership decides; a tenant the user is not a member of → 403; no user → 401.
  - `GET /health`, `GET /api/me` (user, memberships with currency/locale/timezone, selected scope), `GET /api/openapi.json`.
  - `X-Request-Id` on every response; unhandled errors logged with the request id and never leaked.
- `db/migrations/0006_app_roles.sql`: login role `app_user` (member of `app`, no BYPASSRLS; password from `APP_DB_PASSWORD` via `db/apply.sh`, default `app` for local only); `auth.resolve_user(email)` security-definer function so the API can resolve a caller before any scope exists.
- Tests (`apps/api/test`): scratch database per run with migrations, seed and the importer fixture; 9 tests: health, anonymous 401, org admin sees three tenants, `X-Tenant` narrows scope and returns NOK/nb-NO, non-member 403, single-tenant default selection, 404 under `/api`, RLS through the app pool (fxno sees 1 customer, fxsa sees 4), `app_user` cannot bypass RLS.
- GitHub Actions: Postgres service, `db/apply.sh`, importer e2e, `pnpm typecheck`, `pnpm test`.

**Fixed along the way**

- `300_core_users.sql`: `not ilike any (...)` was always true, so every staff user got every tenant. Now `not (role ilike any (...))`. Adam is fxsa only, as the fixture intends.
- `import.stable_uuid()` produced md5-shaped ids without RFC 4122 version/variant bits; strict validators (Zod 4 `uuid()`) rejected them. It now emits version-5-shaped values. Ids of already-loaded rows change on the next full reload; no real load has happened yet, so nothing to migrate.

**Decisions**

- Zod 4 (the type provider requires it). Money will be `{ amount_minor, currency }` in every schema.
- No ORM; SQL strings in route modules; every application query goes through `req.scoped()`.

**Slipped / carried over**

- ESLint not configured (prettier + `tsc --strict` only). Add with the web app on Day 3 if wanted.
- A database loaded before the `stable_uuid` change keeps the old user ids because the users upsert intentionally preserves `id` on conflict (stable staff identity across reloads). Local databases created before this commit need `make db-reset && make import-fixture` once.
- Docker was not exercised in the build sandbox (no daemon); the compose file follows the standard image and healthcheck. Verify `make up` on the Mac first thing on Day 2.

**Acceptance**

- `pnpm test` green (9/9); importer e2e green; server smoke: `/health` ok, `/api/me` with `X-Tenant: fxno` returns NOK scope, anonymous `/api/me` 401, `/api/openapi.json` lists `/health` and `/api/me`.
