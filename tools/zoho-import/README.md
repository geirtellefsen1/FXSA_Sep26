# zoho-import

Loads a Zoho CRM backup (`zoho backup/Data_001 (1)/…`) into the Flexistore PMS database in three stages:

| Stage | Schema | What |
|---|---|---|
| **stage** | `zoho_raw.*` | Every CSV, verbatim, one text-typed table per module (chunks `_001…_021` appended). Nothing is interpreted. |
| **legacy** | `legacy.*` | The existing Zoho data, typed and cleaned: SAST→UTC, booleans, money, E.164 phones, market → tenant. Picklists verbatim. Nothing dropped (`extra` jsonb holds every column). |
| **core** | `public.*` | The future PMS model (from the operator-console UX). Only what has a home there is mapped; every row keeps `source='zoho'` + `source_ref`. |

Then **validate** writes reconciliation checks to `import.checks` (row counts vs manifest, FK resolution, market coverage, core = legacy counts, fill rates).

## Run

```bash
cd tools/zoho-import
pip install -e .                      # or: pip install "psycopg[binary]"
export FXPMS_DSN=postgresql://app_import_user:…@host:5432/fxpms

zoho-import manifest  --root "/path/zoho backup/Data_001 (1)"      # inventory: sha256 + csv-parsed row counts → manifest.json
zoho-import --dsn $FXPMS_DSN run --root "/path/zoho backup/Data_001 (1)" [--import-dob] [--expect-full-backup]
```

`run` = manifest (if missing) → stage → preflight → transform (legacy, then core) → validate. Exit code 1 if any `error` check fails.
Individual steps: `stage`, `preflight`, `transform [--only legacy|core]`, `validate [--expect-full-backup]`.

## When a Zoho label differs from what the transforms expect

Each transform declares its contract in a header:

```sql
-- requires: zoho_raw.units(record_id, bod_unit_name, facility__id, status)
-- optional: zoho_raw.units(storageunitid, easyid, …)
```

`preflight` hard-fails on a missing **required** column and adds a NULL column for each missing **optional** one, so the SQL always runs and a
mismatch shows up as an empty column (and a `fill …` warning in validate) instead of a crash. Fix a mismatch with `aliases.json`:

```json
{ "units": { "storageunitid": "storage_unit_id" } }    // staging table → { expected column : actual column }
```

Header labels become column names like this: lower-case, non-alphanumerics → `_`, lookup columns ending in `.id` get `__id`
(`Facility.id` → `facility__id`, `Facility ID` → `facility_id`), leading digits get `_` (`0.5 sqm` → `_0_5_sqm`).

## Test

```bash
DSN=postgresql://fx:fx@localhost:5432/fxpms ../../db/apply.sh     # fresh schema
python tests/test_e2e.py                                           # synthetic fixture through every stage + assertions
```

The fixture (`tests/make_fixture.py`) is generated, not real data. The real headers were not available when the transforms were written; the
contracts encode the labels documented in `docs/source/ZOHO_BACKUP_CRM_IMPORT_SPEC_2.md`. Expect `preflight` to add some optional columns and
`validate` to flag a few `fill` warnings on the first real run — that is the signal to add aliases, not a failure of the pipeline.

## Volume notes (full backup)

* `AppEvents` is 2.09M rows / 2.9 GB across 21 files. Staging is a streamed `COPY`; expect roughly 5–15 minutes on a laptop-class Postgres.
  `220_app_events.sql` and `370_core_activity_log.sql` are single set-based inserts into monthly partitions.
* Run the core stage with `work_mem` ≥ 256 MB and `maintenance_work_mem` ≥ 1 GB for sensible sort/hash behaviour.
* The core stage is a **full reload** (truncates the core tables it fills). Delta syncs from Zoho (Phase 1) are a separate upsert path keyed on `(tenant_id, source, source_ref)`.
