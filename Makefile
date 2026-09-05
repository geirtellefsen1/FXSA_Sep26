# Flexistore PMS — local runtime
# make up && make db-apply && make import-fixture && make dev
DSN ?= postgresql://fx:fx@localhost:5432/fxpms
APP_DB_PASSWORD ?= app

.PHONY: up down db-apply db-reset import-fixture test dev api web

up:
	docker compose up -d && until docker compose exec -T db pg_isready -U fx -d fxpms >/dev/null 2>&1; do sleep 1; done

down:
	docker compose down

db-apply:
	DSN=$(DSN) APP_DB_PASSWORD=$(APP_DB_PASSWORD) db/apply.sh

db-reset:
	psql "$(DSN)" -q -c "drop schema if exists public cascade; create schema public; drop schema if exists legacy cascade; drop schema if exists import cascade; drop schema if exists zoho_raw cascade; drop schema if exists auth cascade;"
	$(MAKE) db-apply

import-fixture:
	cd tools/zoho-import && python3 tests/make_fixture.py tests/fixture/Data_001 && python3 -m zoho_import.cli --dsn "$(DSN)" run --root tests/fixture/Data_001 --refresh-manifest

test:
	cd tools/zoho-import && FXPMS_DSN=$(DSN) python3 tests/test_e2e.py
	pnpm -r test

dev:
	pnpm -r --parallel dev

api:
	pnpm --filter @fxpms/api dev
