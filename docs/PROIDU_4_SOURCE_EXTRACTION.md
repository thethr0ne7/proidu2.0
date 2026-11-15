# PROIDU scoped source extraction: design checkpoint
# This is a PUBLIC repository. NEVER commit dump files, credentials, applicant records or raw source snapshots.

## Reason for the scoped export
The source Supabase PostgreSQL database also holds data for other applications. Exporting all of public schema to PROIDU 4.0 would duplicate unrelated data and tie the new application to unrelated subsystems.

## Candidate tables (MUST verify live dependencies before restoration)
regions
institutions
sources
programs
admission_offers
exam_sets
exam_requirements
cutoff_history
individual_achievement_rules
admission_deadlines
required_documents
ingestion_runs
source_snapshots
validation_issues
institution_monitoring_metrics
institution_ugs_groups
ingestion_queue
institution_source_registry
factory_runs
source_registry
ingestion_jobs
extraction_evidence
coverage_snapshots
payment_intents
university_check_requests
platform_ingestion_jobs
platform_data_versions
platform_evidence_records
platform_source_checkpoints

## Explicit exclusions
Do not include the `gi_*` and `af_*` tables in PROIDU-target export, nor the separate government-intelligence storage bucket. Some objects with generic names, such as workflow_runs and production_artifacts, may belong to AI Factory rather than PROIDU: check lineage first. Legacy v1 tables are empty but may be needed for archive audit.

## Export and cutover gates
1. Inventory installed extensions, schema objects, triggers, functions, foreign keys, scheduled jobs and storage objects, plus table exact counts.
2. Obtain a **source-wide backup** for disaster recovery in an access-controlled location, then independently test restoration. On Supabase Free, no daily managed backup guarantee is included.
3. Export only approved PROIDU tables (see source table allowlist); do not use a live data export as a public GitHub Actions artifact.
4. Restore to an isolated PostgreSQL 17 disposable/staging database, not the canonical production DB. Reconcile FK references, RLS/roles, UUIDs, timestamps and counts.
5. Backfill any new schema for PROIDU ingestion jobs; current 0001/0002 baseline does NOT recreate all extra 2026 live-source tables. Do not load into it blindly.
6. Run EGE/SPO/source/evidence regression tests, verify backups and staged rollback.
7. Only after approved source-of-truth handoff switch traffic, then plan eventual removal of the shared Supabase dependency separately for other systems.

## Private operator export
The script `scripts/backup_proidu_source.sh` runs **only** on a trusted operator machine with a PostgreSQL 17 client and a local restricted PG service/password file.
It creates a custom-format export, verifies archive readability, writes SHA256 and warns that import integration is **NOT** automatic. The operator must store the export encrypted and independently restore it before declaring it a valid backup.
