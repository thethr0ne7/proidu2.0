#!/usr/bin/env bash
# Full source SCHEMA-only forensic export from Supabase PG17.
# Execute only on an operator-controlled machine with a restricted encrypted volume.
# Never run in public CI, never commit output to GitHub.
set -Eeuo pipefail
umask 077
: "${OUTPUT_DIR:?private encrypted output directory is required}"
: "${PGSERVICEFILE:?private pg_service.conf is required}"
: "${PGPASSFILE:?private .pgpass is required}"
command -v pg_dump >/dev/null
command -v sha256sum >/dev/null
pg_dump --version | grep -Eq 'PostgreSQL (17|18)\.' ||
  { echo 'PostgreSQL 17 or 18 client required'; exit 2; }
mkdir -p "${OUTPUT_DIR}"
chmod 700 "${OUTPUT_DIR}"
filename="${OUTPUT_DIR}/supabase-full-schema-$(date -u +%Y%m%dT%H%M%SZ).sql"
# This includes all non-system schemas, SQL function bodies, indexes,
# triggers, views, policies, and DDL; it does NOT back up table records.
# It might contain stored configuration literals: treat as highly sensitive.
pg_dump --dbname='service=source_proidu' --schema-only \
  --file="${filename}.partial"
test -s "${filename}.partial"
mv "${filename}.partial" "${filename}"
sha256sum "${filename}" > "${filename}.sha256"
echo 'READ-ONLY complete schema export created. NOT a database backup.'
echo 'Test restore separately in an isolated matching PostgreSQL 17 environment.'
