#!/usr/bin/env bash
# Apply all migrations + seeds in order. Usage: DSN=postgresql://... db/apply.sh
set -euo pipefail
DSN="${DSN:-postgresql://fx:fx@localhost:5432/fxpms}"
APP_DB_PASSWORD="${APP_DB_PASSWORD:-app}"      # password for the app_user login role (0006); override outside local dev
cd "$(dirname "$0")"
for f in migrations/*.sql seed/*.sql; do
  echo "== $f"
  psql "$DSN" -v ON_ERROR_STOP=1 -q -c "set fxpms.app_password = '$APP_DB_PASSWORD'" -f "$f"
done
echo "applied"
