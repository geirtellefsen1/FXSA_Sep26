"""
Inventory a Zoho backup folder: file → module, size, sha256, csv-parsed row
count, header. Written to manifest.json next to the data folder (or --out).
The row count uses a real CSV parser (fields contain embedded newlines), so it
is the number the loader must reproduce.
"""
from __future__ import annotations
import csv, fnmatch, hashlib, json, os, sys, time
from pathlib import Path
from .config import MODULES, sanitize_table, sanitize_column

csv.field_size_limit(min(sys.maxsize, 2**31 - 1))

def match_module(basename: str):
    for m in MODULES:
        for pat in m.patterns:
            if fnmatch.fnmatch(basename.lower(), pat.lower()):
                return m
    return None

def sha256_of(path: Path, bufsize=1 << 20) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        while chunk := f.read(bufsize):
            h.update(chunk)
    return h.hexdigest()

def scan_csv(path: Path, count_rows=True):
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.reader(f)
        header = next(reader, [])
        n = 0
        if count_rows:
            for _ in reader:
                n += 1
    seen: set[str] = set()
    cols = [sanitize_column(h, seen) for h in header]
    return header, cols, n

def chunk_no(basename: str) -> int | None:
    stem = basename.rsplit(".", 1)[0]
    tail = stem.rsplit("_", 1)[-1]
    return int(tail) if tail.isdigit() else None

def build_manifest(root: Path, count_rows=True, hash_files=True) -> dict:
    files = []
    t0 = time.time()
    for p in sorted(root.rglob("*.csv")):
        rel = p.relative_to(root).as_posix()
        mod = match_module(p.name)
        header, cols, n = scan_csv(p, count_rows)
        files.append({
            "path": rel,
            "module": mod.key if mod else None,
            "staging_table": mod.key if mod else sanitize_table(p.stem),
            "tier": mod.tier if mod else None,
            "chunk": chunk_no(p.name),
            "size_bytes": p.stat().st_size,
            "sha256": sha256_of(p) if hash_files else None,
            "header": header,
            "columns": cols,
            "rows": n if count_rows else None,
        })
    attachments_dir = None
    for cand in (root / "Attachments", root.parent / "Attachments", root.parent.parent / "Attachments"):
        if cand.is_dir():
            attachments_dir = cand
            break
    att = {"dir": str(attachments_dir) if attachments_dir else None, "count": 0, "bytes": 0}
    if attachments_dir:
        for p in attachments_dir.rglob("*"):
            if p.is_file():
                att["count"] += 1
                att["bytes"] += p.stat().st_size
    return {
        "root": str(root),
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "seconds": round(time.time() - t0, 1),
        "files": files,
        "attachments": att,
        "unmapped": [f["path"] for f in files if f["module"] is None],
        "totals": {"files": len(files), "rows": sum(f["rows"] or 0 for f in files), "bytes": sum(f["size_bytes"] for f in files)},
    }

def write_manifest(root: Path, out: Path | None = None, **kw) -> Path:
    m = build_manifest(root, **kw)
    out = out or (root / "manifest.json")
    out.write_text(json.dumps(m, indent=2, ensure_ascii=False))
    return out
