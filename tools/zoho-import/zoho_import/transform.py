"""
Run the SQL transforms in numeric order:
  1xx_*.sql   zoho_raw  → legacy.*   (typed, cleaned, nothing dropped)
  2xx_*.sql   legacy.*  → public.*   (the core model from the UX memo)

Each SQL file declares its staging-column contract in a header comment:

  -- requires: zoho_raw.contacts(record_id, last_name, email)
  -- optional: zoho_raw.contacts(first_name, phone, mobile, ...)

Preflight (run before any transform) hard-fails on a missing *required*
column and adds a NULL text column for each missing *optional* one, so the
SQL is stable while a Zoho label that differs from the one assumed here shows
up as an empty column (and a fill-rate warning in validate) instead of a crash.
The real fix for a differing label is aliases.json (see stage.py).

Placeholders replaced textually before execution:
  {{RUN_ID}}        current import.runs.id
  {{IMPORT_DOB}}    'true' | 'false'
"""
from __future__ import annotations
import re, time
from pathlib import Path
import psycopg

TRANSFORMS_DIR = Path(__file__).parent / "transforms"
_contract = re.compile(r"^--\s*(requires|optional):\s*([a-z_]+)\.([a-z0-9_]+)\s*\(([^)]*)\)", re.M)

def list_transforms(only: str | None = None) -> list[Path]:
    """only: None | 'legacy' (files numbered < 300) | 'core' (>= 300) | a filename prefix."""
    files = sorted(TRANSFORMS_DIR.glob("*.sql"))
    if only == "legacy":
        files = [f for f in files if int(f.name[:3]) < 300]
    elif only == "core":
        files = [f for f in files if int(f.name[:3]) >= 300]
    elif only:
        files = [f for f in files if f.name.startswith(only)]
    return files

def parse_contracts(sql: str) -> list[tuple[str, str, str, list[str]]]:
    out = []
    for kind, schema, table, cols in _contract.findall(sql):
        cols = [c.strip() for c in cols.replace("\n", " ").split(",") if c.strip()]
        out.append((kind, schema, table, cols))
    return out

def _ident(s: str) -> str:
    return '"' + s.replace('"', '""') + '"'

def preflight(conn: psycopg.Connection, files: list[Path], fix_optional=True, log=print) -> dict:
    """Return {'missing_required': [...], 'added_optional': [...], 'missing_tables': [...]}."""
    report = {"missing_required": [], "added_optional": [], "missing_tables": []}
    with conn.cursor() as cur:
        cur.execute("select table_name, column_name from information_schema.columns where table_schema='zoho_raw'")
        have: dict[str, set[str]] = {}
        for t, c in cur.fetchall():
            have.setdefault(t, set()).add(c)
        for f in files:
            for kind, schema, table, cols in parse_contracts(f.read_text()):
                if schema != "zoho_raw":
                    continue
                if table not in have:
                    if kind == "requires":
                        report["missing_tables"].append(f"{f.name}: zoho_raw.{table}")
                    else:
                        # optional table: create empty so the SQL still runs
                        cur.execute(f"create table if not exists zoho_raw.{_ident(table)} (_src_file text)")
                        have[table] = {"_src_file"}
                        log(f"  optional table zoho_raw.{table} missing → created empty")
                for c in cols:
                    if c in have.get(table, set()):
                        continue
                    if kind == "requires":
                        report["missing_required"].append(f"{f.name}: zoho_raw.{table}.{c}")
                    elif fix_optional and table in have:
                        cur.execute(f"alter table zoho_raw.{_ident(table)} add column {_ident(c)} text")
                        have[table].add(c)
                        report["added_optional"].append(f"zoho_raw.{table}.{c}")
        conn.commit()
    return report

def run_transforms(conn: psycopg.Connection, run_id: str, files: list[Path], import_dob=False, log=print) -> list[dict]:
    results = []
    for f in files:
        sql = f.read_text()
        sql = sql.replace("{{RUN_ID}}", run_id).replace("{{IMPORT_DOB}}", "true" if import_dob else "false")
        t0 = time.time()
        try:
            with conn.cursor() as cur:
                cur.execute(sql)
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise RuntimeError(f"transform {f.name} failed: {e}") from e
        dt = time.time() - t0
        results.append({"file": f.name, "seconds": round(dt, 1)})
        log(f"  {f.name:<40} {dt:6.1f}s")
    return results
