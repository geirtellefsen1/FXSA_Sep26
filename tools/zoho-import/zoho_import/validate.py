"""
Reconciliation. Every check is written to import.checks(run_id, stage, name,
expected, actual, passed, severity, detail). The CLI prints a summary and
exits non-zero if any severity='error' check failed.

Expected counts come from the backup analysis in
docs/source/ZOHO_BACKUP_CRM_IMPORT_SPEC_2.md (computed from the CSVs on
2026-09-05). They are only asserted when --expect-full-backup is passed;
on a fixture or a partial delta they are reported as info.
"""
from __future__ import annotations
import json
import psycopg

FULL_BACKUP_EXPECTED = {
    # legacy table → row count from the spec
    "legacy.facilities": 55,
    "legacy.units": 7071,
    "legacy.reservations": 27214,
    "legacy.payment_details": 27117,
    "legacy.payments": 187664,          # incl. 426 test rows
    "legacy.unit_status_history": 305287,
    "legacy.reservation_status_history": 14617,
    "legacy.gateways": 339,
    "legacy.communications": 79175,
    "legacy.emails": 16335,
    "legacy.smses": 28554,
    "legacy.calls": 58506,
    "legacy.notes": 14287,
    "legacy.leads": 2746 + 54,
    "legacy.property_prospects": 232 + 13,
    "legacy.business_partners": 90,
    "legacy.offer_requests": 14049,
    "legacy.app_events": 2087453,
    "legacy.app_event_gateways": 6257,
    "legacy.attachments": 399,
    "legacy.zoho_users": 32,
}

SA_SLICE_EXPECTED = {
    "legacy.facilities": 11,
    "legacy.units": 1613,
    "legacy.reservations": 4464,
    "legacy.payments": 44482,
    "legacy.leads": 1146,
    "legacy.property_prospects": 30,
    "legacy.business_partners": 14,
}

def _rec(cur, run_id, stage, name, expected, actual, passed, severity="error", detail=None):
    cur.execute(
        "insert into import.checks (run_id, stage, name, expected, actual, passed, severity, detail) values (%s,%s,%s,%s,%s,%s,%s,%s)",
        (run_id, stage, name, None if expected is None else str(expected), None if actual is None else str(actual), passed, severity, json.dumps(detail or {})),
    )

def _count(cur, table, where="true"):
    cur.execute(f"select count(*) from {table} where {where}")
    return cur.fetchone()[0]

def run_checks(conn: psycopg.Connection, run_id: str, manifest: dict | None, expect_full=False, log=print) -> dict:
    ok = True
    with conn.cursor() as cur:
        # 1. staging: rows loaded == rows in manifest (csv-parsed)
        if manifest:
            by_table: dict[str, int] = {}
            for f in manifest["files"]:
                if f.get("rows") is not None:
                    by_table[f["staging_table"]] = by_table.get(f["staging_table"], 0) + f["rows"]
            for table, expected in by_table.items():
                cur.execute("select to_regclass(%s)", (f"zoho_raw.{table}",))
                if cur.fetchone()[0] is None:
                    _rec(cur, run_id, "staging", f"rows {table}", expected, None, False, "error", {"reason": "table not staged"}); ok = False; continue
                actual = _count(cur, f'zoho_raw."{table}"')
                passed = actual == expected
                ok &= passed
                _rec(cur, run_id, "staging", f"rows {table}", expected, actual, passed)

        # 2. legacy: counts (info unless full backup), market coverage, FK resolution
        for table, expected in FULL_BACKUP_EXPECTED.items():
            cur.execute("select to_regclass(%s)", (table,))
            if cur.fetchone()[0] is None:
                continue
            actual = _count(cur, table)
            if expect_full:
                passed = actual == expected
                ok &= passed
                _rec(cur, run_id, "legacy", f"rows {table}", expected, actual, passed)
            else:
                _rec(cur, run_id, "legacy", f"rows {table}", expected, actual, None, "info")

        for table in ("legacy.facilities", "legacy.units", "legacy.contacts", "legacy.reservations", "legacy.payments"):
            n = _count(cur, table)
            if n == 0:
                continue
            unresolved = _count(cur, table, "tenant_id is null")
            _rec(cur, run_id, "legacy", f"tenant assigned {table}", 0, unresolved, unresolved == 0, "error")
            ok &= unresolved == 0
            cur.execute(f"select market_source, count(*) from {table} group by 1 order by 2 desc")
            dist = dict(cur.fetchall())
            defaulted = dist.get("default", 0)
            _rec(cur, run_id, "legacy", f"market derivation {table}", "≤5% default", f"{defaulted}/{n}", defaulted <= 0.05 * n, "warn", {"by_source": dist})

        fk_checks = [
            ("reservations→units", "select count(*) filter (where u.zoho_id is null), count(*) from legacy.reservations r left join legacy.units u on u.unit_uuid = r.unit_uuid where r.unit_uuid is not null", 0.0),
            ("reservations→facilities", "select count(*) filter (where f.zoho_id is null), count(*) from legacy.reservations r left join legacy.facilities f on f.zoho_id = r.facility_zoho_id where r.facility_zoho_id is not null", 0.0),
            ("reservations→contacts (User ID)", "select count(*) filter (where c.zoho_id is null), count(*) from legacy.reservations r left join legacy.contacts c on c.appuser_uuid = r.user_uuid where r.user_uuid is not null", 0.03),
            ("payments→reservations", "select count(*) filter (where r.zoho_id is null), count(*) from legacy.payments p left join legacy.reservations r on r.zoho_id = p.reservation_zoho_id where p.reservation_zoho_id is not null", 0.0),
            ("units→facilities", "select count(*) filter (where f.zoho_id is null), count(*) from legacy.units u left join legacy.facilities f on f.zoho_id = u.facility_zoho_id", 0.0),
            ("unit_status_history→units", "select count(*) filter (where u.zoho_id is null), count(*) from legacy.unit_status_history h left join legacy.units u on u.zoho_id = h.unit_zoho_id", 0.0),
        ]
        for name, sql, tolerance in fk_checks:
            cur.execute(sql)
            missing, total = cur.fetchone()
            if not total:
                continue
            rate = missing / total
            passed = rate <= tolerance
            sev = "warn" if "User ID" in name else "error"   # unresolved User IDs are deleted app accounts (spec §1: 2.4%), imported as orphan placeholders
            if sev == "error":
                ok &= passed
            _rec(cur, run_id, "legacy", f"fk {name}", f"≤{tolerance:.0%} unresolved", f"{missing}/{total} ({rate:.2%})", passed, sev)

        # timestamp sanity
        cur.execute("select count(*) from legacy.reservations where created_at > now() + interval '1 day' or backend_created_at < date '2019-01-01'")
        bad = cur.fetchone()[0]
        _rec(cur, run_id, "legacy", "timestamps in range (reservations)", 0, bad, bad == 0)
        ok &= bad == 0

        # SA slice (info)
        for table, expected in SA_SLICE_EXPECTED.items():
            cur.execute("select to_regclass(%s)", (table,))
            if cur.fetchone()[0] is None:
                continue
            actual = _count(cur, table, "market = 'SA'")
            _rec(cur, run_id, "legacy", f"SA slice {table}", expected, actual, (actual == expected) if expect_full else None, "warn" if expect_full else "info")

        # 3. core: every legacy row that should map, did
        core_checks = [
            ("sites = legacy facilities", "select count(*) from sites where source='zoho'", "select count(*) from legacy.facilities"),
            ("units = legacy units", "select count(*) from units where source='zoho'", "select count(*) from legacy.units"),
            ("customers = legacy contacts (non web-visitor)", "select count(*) from customers where source='zoho'", "select count(*) from legacy.contacts where population <> 'web_visitor'"),
            ("subscriptions = legacy reservations (paid or ended)", "select count(*) from subscriptions where source='zoho'", "select count(*) from legacy.reservations where payment_status not in ('UNPAID','PENDING')"),
            ("reservations+abandoned leads = legacy drafts", "select (select count(*) from reservations where source='zoho') + (select count(*) from leads where origin='zoho' and source='abandoned-checkout')", "select count(*) from legacy.reservations where payment_status in ('UNPAID','PENDING')"),
            ("payments = legacy payments (non-test)", "select count(*) from payments where source='zoho'", "select count(*) from legacy.payments where not is_test"),
            ("activity_log ≥ legacy app_events", "select count(*) from activity_log where source='zoho'", "select count(*) from legacy.app_events"),
        ]
        for name, a_sql, b_sql in core_checks:
            cur.execute(a_sql); a = cur.fetchone()[0]
            cur.execute(b_sql); b = cur.fetchone()[0]
            passed = a >= b if name.startswith("activity") else a == b
            ok &= passed
            _rec(cur, run_id, "core", name, b, a, passed)

        cur.execute("select count(*) from units u where u.status='occupied' and u.current_subscription_id is null")
        n = cur.fetchone()[0]
        _rec(cur, run_id, "core", "occupied units have a current subscription", 0, n, n == 0, "warn")

        # fill rates on key mapped columns → header-mismatch detector
        fills = [
            ("legacy.contacts", "email"), ("legacy.contacts", "phone_e164"), ("legacy.contacts", "appuser_uuid"),
            ("legacy.units", "unit_uuid"), ("legacy.units", "easy_id"), ("legacy.reservations", "reservation_uuid"),
            ("legacy.reservations", "start_date"), ("legacy.payments", "transacted_at"), ("legacy.payments", "total_captured"),
            ("legacy.app_events", "event_type"), ("legacy.app_events", "occurred_at"),
        ]
        for table, col in fills:
            total = _count(cur, table)
            if not total:
                continue
            filled = _count(cur, table, f"{col} is not null")
            rate = filled / total
            _rec(cur, run_id, "legacy", f"fill {table}.{col}", ">0%", f"{rate:.1%}", rate > 0, "warn")

        cur.execute("select stage, name, expected, actual, passed, severity from import.checks where run_id=%s order by checked_at", (run_id,))
        rows = cur.fetchall()
        conn.commit()
    failed = [r for r in rows if r[4] is False and r[5] == "error"]
    warned = [r for r in rows if r[4] is False and r[5] == "warn"]
    for stage, name, exp, act, passed, sev in rows:
        mark = "PASS" if passed else ("FAIL" if passed is False and sev == "error" else ("WARN" if passed is False else "info"))
        log(f"  [{mark:<4}] {stage:<8} {name:<52} expected={exp!s:<16} actual={act}")
    return {"ok": ok and not failed, "failed": len(failed), "warned": len(warned), "total": len(rows)}
