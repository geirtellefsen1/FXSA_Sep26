"""
zoho-import — Zoho CRM backup → Flexistore PMS.

  zoho-import manifest  --root "zoho backup/Data_001 (1)"            # inventory + row counts + sha256 → manifest.json
  zoho-import preflight --root ... --dsn ...                           # stage headers only? no: checks contracts against staged tables
  zoho-import stage     --root ... --dsn ... [--aliases aliases.json]  # COPY every CSV into zoho_raw.*
  zoho-import transform --dsn ... [--import-dob] [--only 1|2]          # zoho_raw → legacy (1xx) → core (2xx)
  zoho-import validate  --dsn ... [--manifest manifest.json] [--expect-full-backup]
  zoho-import run       --root ... --dsn ... [all of the above in order]
"""
from __future__ import annotations
import argparse, json, os, sys
from pathlib import Path
import psycopg
from . import manifest as mf, stage as st, transform as tf, validate as vl

def _conn(dsn: str) -> psycopg.Connection:
    return psycopg.connect(dsn, autocommit=False)

def _new_run(conn, kind, label, options) -> str:
    with conn.cursor() as cur:
        cur.execute("insert into import.runs (kind, source_label, options) values (%s,%s,%s) returning id", (kind, label, json.dumps(options)))
        rid = str(cur.fetchone()[0])
    conn.commit()
    return rid

def _set_run(conn, run_id, status, summary=None, error=None):
    with conn.cursor() as cur:
        cur.execute("update import.runs set status=%s, summary = summary || %s::jsonb, error=%s, finished_at = case when %s in ('validated','failed','aborted') then now() else finished_at end where id=%s",
                    (status, json.dumps(summary or {}), error, status, run_id))
    conn.commit()

def cmd_manifest(a):
    out = mf.write_manifest(Path(a.root), Path(a.out) if a.out else None, count_rows=not a.no_count, hash_files=not a.no_hash)
    m = json.loads(out.read_text())
    print(f"manifest → {out}")
    print(f"  files={m['totals']['files']} rows={m['totals']['rows']:,} bytes={m['totals']['bytes']:,} attachments={m['attachments']['count']}")
    if m["unmapped"]:
        print("  unmapped (staged as-is, not transformed):")
        for u in m["unmapped"]:
            print(f"    - {u}")

def cmd_stage(a, conn=None, run_id=None):
    conn = conn or _conn(a.dsn)
    run_id = run_id or _new_run(conn, "zoho_backup", a.root, {"stage": True})
    aliases = json.loads(Path(a.aliases).read_text()) if a.aliases else None
    only = set(a.only.split(",")) if a.only else None
    print(f"staging {a.root} (run {run_id})")
    mpath = Path(getattr(a, "manifest", None) or (Path(a.root) / "manifest.json"))
    m = json.loads(mpath.read_text()) if mpath.exists() else None
    summary = st.stage_folder(conn, Path(a.root), run_id, drop_existing=not a.append, only=only, aliases=aliases, manifest=m)
    _set_run(conn, run_id, "staged", {"staged": summary})
    return conn, run_id

def cmd_preflight(a, conn=None):
    conn = conn or _conn(a.dsn)
    files = tf.list_transforms()
    rep = tf.preflight(conn, files, fix_optional=not a.dry_run)
    for k, v in rep.items():
        if v:
            print(f"  {k}:")
            for x in v:
                print(f"    - {x}")
    if rep["missing_required"] or rep["missing_tables"]:
        print("preflight FAILED — add an alias in aliases.json or fix the export"); return conn, False
    print("preflight ok")
    return conn, True

def cmd_transform(a, conn=None, run_id=None):
    conn = conn or _conn(a.dsn)
    if not run_id:
        with conn.cursor() as cur:
            cur.execute("select id from import.runs order by started_at desc limit 1")
            r = cur.fetchone()
        run_id = str(r[0]) if r else _new_run(conn, "zoho_backup", None, {})
    files = tf.list_transforms(a.only)
    conn, ok = cmd_preflight(a, conn)
    if not ok:
        _set_run(conn, run_id, "failed", error="preflight failed"); sys.exit(2)
    print("transforming")
    res = tf.run_transforms(conn, run_id, files, import_dob=a.import_dob)
    last = files[-1].name if files else "000"
    _set_run(conn, run_id, "core_loaded" if int(last[:3]) >= 300 else "legacy_loaded", {"transforms": res})
    return conn, run_id

def cmd_validate(a, conn=None, run_id=None):
    conn = conn or _conn(a.dsn)
    if not run_id:
        with conn.cursor() as cur:
            cur.execute("select id from import.runs order by started_at desc limit 1")
            run_id = str(cur.fetchone()[0])
    m = json.loads(Path(a.manifest).read_text()) if a.manifest and Path(a.manifest).exists() else None
    print(f"validating run {run_id}")
    res = vl.run_checks(conn, run_id, m, expect_full=a.expect_full_backup)
    _set_run(conn, run_id, "validated" if res["ok"] else "failed", {"validation": res})
    print(f"checks: {res['total']} total, {res['failed']} failed, {res['warned']} warnings → {'OK' if res['ok'] else 'FAILED'}")
    return res["ok"]

def cmd_run(a):
    root = Path(a.root)
    if not a.manifest:
        a.manifest = str(root / "manifest.json")
    if not Path(a.manifest).exists() or a.refresh_manifest:
        a.out = a.manifest; cmd_manifest(a)
    conn = _conn(a.dsn)
    run_id = _new_run(conn, "zoho_backup", str(root), {"import_dob": a.import_dob, "expect_full": a.expect_full_backup})
    try:
        cmd_stage(a, conn, run_id)
        a.only = None
        cmd_transform(a, conn, run_id)
        ok = cmd_validate(a, conn, run_id)
    except Exception as e:  # noqa
        conn.rollback()
        _set_run(conn, run_id, "failed", error=str(e)[:4000])
        raise
    sys.exit(0 if ok else 1)

def main(argv=None):
    p = argparse.ArgumentParser(prog="zoho-import", description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--dsn", default=os.environ.get("FXPMS_DSN", "postgresql://fx:fx@localhost:5432/fxpms"))
    sub = p.add_subparsers(dest="cmd", required=True)

    s = sub.add_parser("manifest"); s.add_argument("--root", required=True); s.add_argument("--out"); s.add_argument("--no-count", action="store_true"); s.add_argument("--no-hash", action="store_true")
    s = sub.add_parser("stage"); s.add_argument("--root", required=True); s.add_argument("--aliases"); s.add_argument("--only"); s.add_argument("--append", action="store_true")
    s = sub.add_parser("preflight"); s.add_argument("--dry-run", action="store_true")
    s = sub.add_parser("transform"); s.add_argument("--import-dob", action="store_true"); s.add_argument("--only", help="legacy | core | filename prefix"); s.add_argument("--dry-run", action="store_true")
    s = sub.add_parser("validate"); s.add_argument("--manifest"); s.add_argument("--expect-full-backup", action="store_true")
    s = sub.add_parser("run"); s.add_argument("--root", required=True); s.add_argument("--aliases"); s.add_argument("--manifest"); s.add_argument("--refresh-manifest", action="store_true")
    s.add_argument("--import-dob", action="store_true"); s.add_argument("--expect-full-backup", action="store_true"); s.add_argument("--append", action="store_true"); s.add_argument("--only"); s.add_argument("--dry-run", action="store_true")
    s.add_argument("--no-count", action="store_true"); s.add_argument("--no-hash", action="store_true"); s.add_argument("--out")

    a = p.parse_args(argv)
    {"manifest": cmd_manifest, "stage": cmd_stage, "preflight": cmd_preflight, "transform": cmd_transform,
     "validate": lambda a: sys.exit(0 if cmd_validate(a) else 1), "run": cmd_run}[a.cmd](a)

if __name__ == "__main__":
    main()
