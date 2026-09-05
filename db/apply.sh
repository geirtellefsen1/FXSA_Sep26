#!/usr/bin/env bash
# Apply all migrations + seeds in order. Usage: DSN=postgresql://... db/apply.sh
set -euo pipefail
DSN="${DSN:-postgresql://fx:fx@localhost:5432/fxpms}"
cd "$(dirname "$0")"
for f in migrations/*.sql seed/*.sql; do
  echo "== $f"
  psql "$DSN" -v ON_ERROR_STOP=1 -q -f "$f"
done
echo "applied"
