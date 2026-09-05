"""
End-to-end: fixture → manifest → stage → legacy → core → validate, then assert the facts that matter.
Run:  FXPMS_DSN=postgresql://fx:fx@localhost:5432/fxpms python tests/test_e2e.py
Needs a database with db/apply.sh already applied. Re-runnable (the core stage is a full reload).
"""
from __future__ import annotations
import json, os, subprocess, sys
from pathlib import Path
import psycopg

HERE = Path(__file__).parent
DSN = os.environ.get("FXPMS_DSN", "postgresql://fx:fx@localhost:5432/fxpms")
SA, NO = "00000000-0000-4000-8000-00000000005a", "00000000-0000-4000-8000-00000000004e"

def q(cur, sql, *args):
    cur.execute(sql, args); return cur.fetchone()[0]

def main():
    root = HERE / "fixture" / "Data_001"
    subprocess.run([sys.executable, str(HERE / "make_fixture.py"), str(root)], check=True)
    r = subprocess.run([sys.executable, "-m", "zoho_import.cli", "--dsn", DSN, "run", "--root", str(root), "--refresh-manifest"], cwd=HERE.parent, capture_output=True, text=True)
    print(r.stdout[-3000:])
    assert r.returncode == 0, r.stderr[-3000:]
    with psycopg.connect(DSN) as conn, conn.cursor() as cur:
        # tenancy: SA rows in fxsa, NO rows in fxno, nothing defaulted
        assert q(cur, "select count(*) from sites where tenant_id=%s", SA) == 1
        assert q(cur, "select count(*) from sites where tenant_id=%s", NO) == 1
        assert q(cur, "select count(*) from legacy.contacts where market_source='default'") == 0
        # SAST → UTC: fixture UNLOCK at 2024-01-15 09:10 SAST
        assert str(q(cur, "select ts from activity_log where action='lock.unlock'")) == "2024-01-15 07:10:00+00:00"
        # tenancy split: 3 paid/ended orders → subscriptions, 1 draft → reservations(abandoned)
        assert q(cur, "select count(*) from subscriptions") == 3
        assert q(cur, "select status from reservations") == "abandoned"
        assert q(cur, "select status::text from subscriptions where source_ref='zcrm_5361160000000005002'") == "arrears"
        assert q(cur, "select closed_reason from subscriptions where source_ref='zcrm_5361160000000005003'") == "checked_out"
        # money: 1045.0 ZAR → 104500 minor; failed attempt keeps its amount
        assert q(cur, "select amount_minor from payments where status='settled' and currency='ZAR'") == 104500
        assert q(cur, "select min(amount_minor) from payments where status='failed'") == 110000
        assert q(cur, "select count(*) from payments where is_test") == 0            # test rows never reach core
        assert q(cur, "select count(*) from legacy.payments where is_test") == 1     # but are kept in legacy
        # customers: web-visitor stub excluded, orphan placeholder created, phones E.164
        assert q(cur, "select count(*) from customers where source='zoho'") == 4
        assert q(cur, "select count(*) from customers where source='zoho-orphan'") == 1
        assert q(cur, "select phone from customers where email='ola@example.no'") == "+4791142723"
        assert q(cur, "select count(*) from legacy.contacts where population='web_visitor'") == 1
        # topology from unit wiring
        assert q(cur, "select count(*) from devices where kind='hub'") == 3
        assert q(cur, "select count(*) from devices where kind='lock'") == 4
        assert q(cur, "select count(*) from devices where kind='gateway' and site_id is null") == 1
        # pricing engine notice → price_history
        assert q(cur, "select new_price_minor from price_history") == 135450
        # unit status timeline reconstructed
        assert q(cur, "select count(*) from activity_log where action='unit.status_changed'") == 3
        # communications → one conversation per customer with messages
        assert q(cur, "select count(*) from conversations where customer_id is not null") == 2
        assert q(cur, "select count(*) from messages") == 6
        # occupancy view
        assert float(q(cur, "select occupancy_pct from v_site_occupancy where short_code='RBM'")) == 66.7
        # RLS: fxno context cannot see SA rows, through tables or views
        cur.execute("set role app"); cur.execute("select set_config(%s, %s, false)", ("app.tenant_ids", NO))
        assert q(cur, "select count(*) from customers") == 1
        assert q(cur, "select count(*) from v_site_occupancy") == 1
        assert q(cur, "select count(*) from legacy.reservations") == 1
        cur.execute("reset role")
        # unmapped file staged, reported
        m = json.loads((root / "manifest.json").read_text())
        assert "Some New Module_001.csv" in m["unmapped"]
        assert q(cur, "select count(*) from zoho_raw.some_new_module") == 1     # unknown files are staged under a derived name
        assert q(cur, "select count(*) from zoho_raw.sticky_notes") == 1        # skip-tier modules are staged, never transformed
    print("E2E OK")

if __name__ == "__main__":
    main()
