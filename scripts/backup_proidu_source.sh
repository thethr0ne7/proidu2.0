#!/usr/bin/env bash
# Export PROIDU-scoped tables from shared Supabase PostgreSQL 17.
# Run locally on an authorized trusted host. NEVER upload the result to GitHub.
set -Eeuo pipefail
umask 077
: "${OUTPUT_DIR:?Set OUTPUT_DIR to a private, encrypted volume}"
: "${PGSERVICEFILE:?Set PGSERVICEFILE to a local, non-committed pg_service.conf}"
: "${PGPASSFILE:?Set PGPASSFILE to a local, non-committed .pgpass}"
command -v pg_dump >/dev/null
command -v pg_restore >/dev/null
command -v sha256sum >/dev/null
pg_dump --version | grep -Eq '(PostgreSQL) (17|18)\.' || { echo "Use pg_dump 17 or 18"; exit 2; }
mkdir -p "${OUTPUT_DIR}"
chmod 700 "${OUTPUT_DIR}"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
dest="${OUTPUT_DIR}/proidu-scoped-${timestamp}.dump"
trap 'echo "Backup did not finish; check private output directory" >&2' ERR

# Manual allowlist: no other GI/AF data is copied. Avoid generic-purpose
# workflow_runs/production_artifacts until verified as belonging to PROIDU.
tables=(
 regions institutions sources programs admission_offers exam_sets exam_requirements
 cutoff_history individual_achievement_rules admission_deadlines required_documents
 ingestion_runs source_snapshots validation_issues institution_monitoring_metrics
 institution_ugs_groups ingestion_queue institution_source_registry factory_runs
 source_registry ingestion_jobs extraction_evidence coverage_snapshots
 payment_intents university_check_requests platform_ingestion_jobs
 platform_data_versions platform_evidence_records platform_source_checkpoints
)
args=()
for table in "${tables[@]}"; do args+=(--table="public.${table}"); done

# Connection details resolved from local ~/.pg_service.conf and ~/.pgpass.
# The output includes source schema/data for the allowlist but is not a
# whole-project DR image; full-source recovery is a separate controlled task.
pg_dump --dbname="service=source_proidu" --format=custom   --no-owner --no-acl --file="${dest}.tmp" "${args[@]}"
pg_restore --list "${dest}.tmp" >/dev/null
mv "${dest}.tmp" "${dest}"
sha256sum "${dest}" > "${dest}.sha256"
echo "Private archive verified and checksum written; NOT restored yet."
echo "Location: ${dest}"
echo "Treat as sensitive until encrypted and restore-tested."
