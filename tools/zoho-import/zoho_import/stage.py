"""
Stage every CSV into schema zoho_raw, one text-typed table per module, via
COPY ... FROM STDIN (CSV, HEADER). Chunked exports append to the same table
after a header check. A `_src_file` column records the source file per row.

Optional column aliases (aliases.json: {"contacts": {"expected": "actual"}})
are applied by renaming staged columns, so the transforms stay stable when a
Zoho label differs from the one the transforms were written against.
"""
from __future__ import annotations
import csv, io, json, sys, time
from pathlib import Path
import psycopg
from psycopg import sql as _sql
from .config import sanitize_column
from .manifest import match_module, sanitize_table, scan_csv

csv.field_size_limit(min(sys.maxsize, 2**31 - 1))

def _ident(s: str) -> str:
    return '"' + s.replace('"', '""') + '"'

def create_staging_table(cur, table: str, cols: list[str], drop: bool):
    if drop:
        cur.execute(f"drop table if exists zoho_raw.{_ident(table)}")
    cur.execute(
        f"create table if not exists zoho_raw.{_ident(table)} ("
        + ", ".join(f"{_ident(c)} text" for c in cols)
        + ", _src_file text)"
    )

def existing_columns(cur, table: str) -> list[str]:
    cur.execute(
        "select column_name from information_schema.columns where table_schema='zoho_raw' and table_name=%s order by ordinal_position",
        (table,),
    )
    return [r[0] for r in cur.fetchall()]

def copy_file(cur, table: str, cols: list[str], path: Path, bufsize=1 << 20) -> int:
    cur.execute(_sql.SQL("alter table zoho_raw.{} alter column _src_file set default {}").format(_sql.Identifier(table), _sql.Literal(path.name)))
    collist = ", ".join(_ident(c) for c in cols)
    sql = f"copy zoho_raw.{_ident(table)} ({collist}) from stdin with (format csv, header true, encoding 'UTF8')"
    with path.open("rb") as f:
        head = f.read(3)
        if head != b"\xef\xbb\xbf":
            f.seek(0)
        with cur.copy(sql) as cp:
            while chunk := f.read(bufsize):
                cp.write(chunk)
    return cur.rowcount

def stage_folder(conn: psycopg.Connection, root: Path, run_id: str, drop_existing=True, only: set[str] | None = None, aliases: dict | None = None, manifest: dict | None = None, log=print) -> dict:
    files = sorted(root.rglob("*.csv"))
    manifest_rows = {f["path"]: f.get("rows") for f in (manifest or {}).get("files", [])}
    manifest_sha = {f["path"]: f.get("sha256") for f in (manifest or {}).get("files", [])}
    seen_tables: set[str] = set()
    summary = {}
    with conn.cursor() as cur:
        cur.execute("create schema if not exists zoho_raw")
        for p in files:
            mod = match_module(p.name)
            table = mod.key if mod else sanitize_table(p.stem)
            if only and table not in only:
                continue
            header, cols, _ = scan_csv(p, count_rows=False)
            if not header:
                log(f"  skip empty {p.name}")
                continue
            first_time = table not in seen_tables
            if first_time:
                create_staging_table(cur, table, cols, drop=drop_existing)
                seen_tables.add(table)
            else:
                have = [c for c in existing_columns(cur, table) if c != "_src_file"]
                if have != cols:
                    missing = [c for c in cols if c not in have]
                    for c in missing:
                        cur.execute(f"alter table zoho_raw.{_ident(table)} add column {_ident(c)} text")
                    log(f"  ! {p.name}: header differs from first chunk (added {len(missing)} columns)")
            t0 = time.time()
            n = copy_file(cur, table, cols, p)
            conn.commit()
            dt = time.time() - t0
            exp = (manifest_rows or {}).get(p.relative_to(root).as_posix())
            cur.execute(
                "insert into import.files (run_id, module, file_name, size_bytes, sha256, header_cols, rows_expected, rows_loaded, loaded_at) values (%s,%s,%s,%s,%s,%s,%s,%s,now())",
                (run_id, table, p.relative_to(root).as_posix(), p.stat().st_size, (manifest_sha or {}).get(p.relative_to(root).as_posix()), len(cols), exp, n),
            )
            conn.commit()
            summary[table] = summary.get(table, 0) + n
            log(f"  {table:<28} {p.name:<40} {n:>10,} rows  {dt:5.1f}s")
        if aliases:
            for table, mapping in aliases.items():
                have = existing_columns(cur, table)
                for expected, actual in mapping.items():
                    if actual in have and expected not in have:
                        cur.execute(f"alter table zoho_raw.{_ident(table)} rename column {_ident(actual)} to {_ident(expected)}")
                        log(f"  alias {table}.{actual} → {expected}")
            conn.commit()
    return summary
