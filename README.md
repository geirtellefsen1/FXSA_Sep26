# Flexistore PMS — multi-tenant property management for self-storage

Master plan, Phase 1 foundation, and the Zoho migration tooling for a multi-tenant PMS serving Flexistore South Africa, Flexistore Norway and, later, other operators.

**Start here:** [`docs/00-MASTER-PLAN.md`](docs/00-MASTER-PLAN.md).

| Path | What |
|---|---|
| `docs/00-MASTER-PLAN.md` | Where things stand, product definition, architecture, phases 0–6, workstreams, risks |
| `docs/01-PHASE-1.md` | The simple system on the Zoho data: milestones, screens, acceptance criteria, cutover runbook |
| `docs/02-DATA-MODEL.md` | Core model (from the UX memo) + legacy model + the mapping between them + multi-tenant safety checklist |
| `docs/03-ZOHO-IMPORT-SPEC.md` | How each Zoho module becomes legacy and core rows; market derivation; validation; delta sync |
| `docs/04-COWORK-EXPORT-RUNBOOK.md` | For Claude CoWork: how to export what it holds (CSV contracts A and B) and load it |
| `docs/05-UX-PHASE-1.md` | The operator-console prototype mapped to Phase 1 data; tenant switcher; Migration screen |
| `docs/06-DECISIONS.md` | Decisions with rejected alternatives and confidence; open questions by phase |
| `docs/source/` | The Zoho backup analysis this plan is built on |
| `db/migrations/` | `0001` tenancy · `0002` core (memo-derived, RLS-safe, tenant-scoped keys) · `0003` legacy (Zoho) · `0004` import pipeline · `0005` RLS |
| `db/seed/` | Flexistore org + tenants (fxsa, fxno, fxfi) + agent capability catalogue |
| `db/apply.sh` | Apply everything in order: `DSN=postgresql://… db/apply.sh` |
| `tools/zoho-import/` | Importer: manifest → stage → legacy → core → validate; fixture + end-to-end test |
| `ux/prototype/` | The operator-console prototype (React, Babel-standalone) with the Phase 1 shell changes; `MEMO.md` is the product spec |

## Quick start (local)

```bash
# Postgres 16
createdb fxpms
DSN=postgresql://localhost/fxpms db/apply.sh

# importer + test on the synthetic fixture
cd tools/zoho-import && pip install -e . && FXPMS_DSN=postgresql://localhost/fxpms python tests/test_e2e.py

# prototype
cd ux/prototype && python3 -m http.server 8080   # open http://localhost:8080/index.html
```

## Status

Phase 0 (this repository) is complete: schema, importer, prototype under version control, plan. Phase 1 starts with loading the real backup (`docs/04-COWORK-EXPORT-RUNBOOK.md`).
