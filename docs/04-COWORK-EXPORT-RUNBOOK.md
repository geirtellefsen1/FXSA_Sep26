# Runbook for Claude CoWork — exporting the data you hold into the Flexistore PMS database

**Audience.** Claude CoWork (or a person) working on the machine that holds the Zoho backup and any other FXSA/FXNO data files. This runbook says exactly what to produce, in what format, and how to get it into the new database. It assumes no knowledge of the target system beyond this repository.

**Ground rules**

1. You export **existing data only**. Do not reshape it into the future model; the importer does that. Do not "clean" values, rename headers, fill blanks, or split files by market.
2. Never edit a CSV by hand or with line-based tools. Zoho fields contain embedded newlines and quotes; only a real CSV parser (`csv` module, DuckDB, pandas with `engine="c"`) may read or write them.
3. Never load anything into schema `public` directly. Everything goes through `zoho_raw` → `legacy` → `public` via `zoho-import`, or through Contract B (below) for non-Zoho sources.
4. Personal data (63k contacts, DOB, addresses, KYC status, chat transcripts) travels encrypted and is deleted from intermediate locations after the load. Date of birth is not imported unless the run is started with `--import-dob`.

---

## 1. What you have

| Source | Where | Contract |
|---|---|---|
| Zoho backup `Data_001` | `zoho backup/Data_001 (1)/` (Data + Metadata + RecordImages) | **A** (verbatim) |
| Zoho attachments | `zoho backup/Attachments/` (≈680 files, 1.1 GB, named `<fileid>_<original name>`) | **A** (verbatim) |
| Anything not from Zoho (site sourcing digests, unit-number PDFs, landlord spreadsheets, price lists) | wherever it is | **B** (canonical CSV), or leave it out of Phase 1 and say so |

If the folder layout differs, do not rearrange it; pass the actual path to `--root` and note the difference in the hand-back.

---

## 2. Contract A — Zoho backup, verbatim (preferred)

**Format:** exactly the files Zoho produced. UTF-8 (with or without BOM), RFC 4180 quoting, header row of Zoho labels, chunked exports (`_001`, `_002`, …) left as separate files.

**Steps**

```bash
# 0. one-time
cd <repo>/tools/zoho-import && pip install -e .

# 1. inventory — produces manifest.json next to the data: every file, sha256, csv-parsed row count, header
zoho-import manifest --root "/path/zoho backup/Data_001 (1)"
```

Check the manifest summary it prints:

* `files` should be around 60 CSVs including `Metadata/`; `rows` around 2.9 million (AppEvents dominates).
* `unmapped:` lists files the registry does not know. Expected: none, or Zoho system files. Anything else: report it; it is still staged.
* `attachments.count` ≈ 680.

```bash
# 2. package (optional, when the database is not reachable from this machine)
tar -C "/path/zoho backup" -cf - "Data_001 (1)" Attachments | zstd -T0 -19 -o zoho_backup_2026-09-05.tar.zst
sha256sum zoho_backup_2026-09-05.tar.zst > zoho_backup_2026-09-05.sha256
# encrypt for transfer (age or gpg to the recipient's key), upload to the agreed bucket, share the checksum out-of-band
```

```bash
# 3. load — from the machine that can reach the database (staging first, never production directly)
export FXPMS_DSN='postgresql://app_import_user:…@db-host:5432/fxpms?sslmode=verify-full'
zoho-import --dsn "$FXPMS_DSN" run --root "/path/zoho backup/Data_001 (1)" --expect-full-backup
```

`run` prints one line per staged file with row counts, the preflight report, one line per transform, and every reconciliation check with `PASS / FAIL / WARN / info`, then a summary. Expect the first real run to report `added_optional:` columns and a few `fill` warnings; those are label mismatches (see §5), not data loss.

```bash
# 4. hand back
psql "$FXPMS_DSN" -c "select stage, name, expected, actual, passed, severity from import.checks where run_id = (select id from import.runs order by started_at desc limit 1) order by checked_at" > reconciliation.txt
```

Return: `manifest.json`, the console output of `run`, `reconciliation.txt`, and the list of aliases you added (if any).

**Runtime expectations.** Staging streams the CSVs into Postgres with `COPY`; the 2.9 GB AppEvents set is the long part. On a laptop-class Postgres the whole run is in the 15–40 minute range (**confidence: moderate**; it has not been run on the full backup yet). Set `work_mem = 256MB` and `maintenance_work_mem = 1GB` on the session or database for the core stage.

---

## 3. Contract B — canonical CSV for non-Zoho data

Use this only for data that is not in Zoho and that Phase 1 needs. One UTF-8 CSV per target table, header row with the exact column names of the core table (`db/migrations/0002_core.sql`), plus two mandatory columns:

| Column | Value |
|---|---|
| `tenant_slug` | `fxsa`, `fxno` or `fxfi` |
| `source_ref` | a stable identifier from the source system (row id, sheet name + row number, file name + key). Re-sending the same `source_ref` updates the row instead of duplicating it. |

Rules:

* Money as **decimal in major units with a dot** (`1045.00`) plus a `currency` column; the loader converts to minor units. Never pre-multiply.
* Dates `YYYY-MM-DD`; timestamps ISO 8601 **with offset** (`2026-05-25T14:30:00+02:00`). No local times without offset.
* Phones as dialled, with country code (`+27 82 555 1142`); the loader normalises.
* Foreign keys by natural key, not uuid: `site_short_code` (3 letters), `unit_number`, `customer_email` or `customer_account_number`. The loader resolves them and rejects rows it cannot resolve, listing them.
* Enums exactly as in `02-DATA-MODEL.md` §2.3.
* File name = `<table>.csv`, e.g. `units.csv`, `landlords.csv`, `site_agreements.csv`, `pricing_rules.csv`.

The Contract B loader is a Phase 1 deliverable (`zoho-import canonical --dir …`); it shares the staging and validation machinery. Until it exists, deliver the files with the layout above and they will load unchanged.

---

## 4. Attachments

Do not rename or move files under `Attachments/`. The index row's `Record Id` (without `zcrm_`) is the file-name prefix; the importer records `documents.local_path = Attachments/<id>_<name>`. Re-hosting to object storage happens in Phase 1 M5 with a separate job that reads `documents.local_path`, uploads, and sets `storage_key`. If you package for transfer, keep the `Attachments/` directory beside `Data_001 (1)/` inside the archive so relative paths hold.

---

## 5. When the preflight or validation complains

| Message | Meaning | Action |
|---|---|---|
| `missing_required: zoho_raw.units.bod_unit_name` | a column the transform cannot do without has a different label in your export | find the actual header in `manifest.json → files[].header`, add `{"units": {"bod_unit_name": "<actual sanitised name>"}}` to `aliases.json`, re-run `stage --aliases aliases.json` then `transform` |
| `added_optional: …` | optional columns not present; created empty | fine if the label genuinely does not exist in your export; otherwise alias as above |
| `[WARN] fill legacy.contacts.phone_e164 … 0.0%` | a mapped column came out empty | almost always a label mismatch → alias; the raw value is still in `legacy.contacts.extra` |
| `[FAIL] staging rows <table>` | rows loaded ≠ rows the manifest counted | the file changed between manifest and stage, or an encoding problem; re-run `manifest` and `stage` for that table (`--only <table>`) |
| `[WARN] market derivation legacy.contacts … 9%/…` | more contacts than expected fell back to the default market | not a load error; list them for review (`select … from legacy.contacts where market_source = 'default'`) |
| `[FAIL] fk …` | a relationship the analysis says is 100% resolvable is not | stop and report; do not force it |

---

## 6. Do not

* Do not concatenate the chunked files; the loader appends chunks into one table and verifies headers.
* Do not convert timestamps; they are SAST in the export and the loader converts them.
* Do not deduplicate contacts; Zoho already enforces unique emails, and the populations (app users, visitors, partner people) are separated by the transform.
* Do not remove the 426 test payments; they are kept in `legacy` and flagged.
* Do not load into production before a staging run has produced a reviewed reconciliation report.

---

## 7. Hand-back checklist

- [ ] `manifest.json` (from the exact folder that was loaded)
- [ ] `run` console output
- [ ] `reconciliation.txt` (all `import.checks` rows of the run)
- [ ] `aliases.json` if used, with a one-line reason per alias
- [ ] Any Contract B files delivered, with the source they came from
- [ ] Confirmation that intermediate copies (archives, bucket objects) were deleted after the load
