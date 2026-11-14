# 08. Zero-loss migration runbook

## Safety boundary
This is a staged migration. Production Supabase and the current Vercel deployment remain active until the new platform passes all acceptance gates. No destructive SQL, migration replay, DNS cutover or secret rotation is performed during the blueprint phase.

## Why a selective migration is mandatory
The live Supabase database contains 133 public tables and 132 migrations. It is shared with AI Factory and Government Intelligence. A full database dump would move unrelated systems and their data. The GitHub repository contains only two migration files and is not the full live migration history.

Observed PROIDU-related counts include 751 institutions, 82 programs, 80 offers, 82 exam sets, 361 exam requirements, 27 sources, 88 source-registry rows, 6,008 ingestion jobs and 11,221 queue rows. Supabase Auth has zero users/identities/sessions; payment_intents and university_check_requests are empty. The only storage bucket is gi-project-documents and belongs to another workflow.

## Phase 0 — freeze and inventory
- Inventory the Vercel ai-platform-core project separately from the PROIDU frontend. Record root directory apps/web, SSO protection, domains, production deployment and all runtime routes.
- Inventory ai-platform-core Supabase SDK use, Edge Functions, scheduled jobs and the PROIDU-MAI worker. Do not assume the MAI scheduled worker is active.
- Freeze schema changes in the legacy PROIDU area.
- Record Supabase project ID, PostgreSQL version, extensions, roles, grants, policies, functions, triggers, views, cron jobs, Edge Function versions and secrets inventory.
- Capture GitHub branch and commit SHAs.
- Export a complete source schema and a selective PROIDU allowlist.
- Export table counts and per-table checksums.
- Inventory object storage separately; do not assume the empty source_snapshots table means no files exist.
- Identify all personal-data columns before export.

## Phase 1 — source backups
- Create a provider-native full backup and verify restore to an isolated temporary instance.
- Export schema-only and custom-format data dumps.
- Store encrypted copies in two independent storage locations.
- Export deployed Edge Function source from the live project, not only GitHub.
- Save all relevant secrets to an approved secret manager; never put them in Git or backup artefacts.
- Record checksums and backup timestamps.

## Phase 2 — target environment
- Provision a separate internal-service staging deployment for the AI Platform Core Next.js app; do not merge it into the public PROIDU frontend until product ownership and dependencies are approved.
- Provision Russian-region PostgreSQL 17.
- Enable only required extensions and create least-privilege roles.
- Create private network, application servers, worker servers, RabbitMQ, Valkey and private S3 buckets.
- Deploy an empty API and health endpoints.
- Set up monitoring, log retention, backups and restore runbook.
- Run connectivity and extension compatibility tests.

## Phase 3 — schema baseline and mapping
Do not replay the 132 Supabase migrations. Build a clean target baseline from the actual live PROIDU schema and the approved target model. Keep source migration history as an immutable archive.

Allowlist the PROIDU-owned tables. Exclude af_* and gi_* tables, unrelated Government Intelligence documents, and shared agent-runtime objects. Where a shared capability is needed, consume it through a documented API or rebuild a narrow PROIDU-owned equivalent.

## Phase 4 — initial data load
- Load reference regions and institution registry.
- Load institutions and branches.
- Load programs and campaign-specific offerings.
- Load exam sets/requirements, deadlines, cutoffs, document requirements and achievement rules.
- Load sources, source registry, evidence, ingestion jobs and coverage snapshots.
- Migrate applicant PII only after data-processing purpose, retention and access policy are approved.
- Do not migrate empty payment/auth tables as if they contain users or transactions; create new schemas for future use.

## Phase 5 — reconciliation
For every allowlisted table compare source and target row counts, primary-key uniqueness, null counts for required fields, foreign-key orphan counts, enum/status distribution, min/max timestamps and campaign years, deterministic JSON checksums, source IDs/evidence references, and file object count/size/SHA-256 if any files are migrated.

A mismatch blocks cutover. Do not waive mismatches because the UI appears to work.

## Phase 6 — dual-run
- Deploy new API read-only against the migrated database.
- Run shadow searches and route calculations against the old and new engines.
- Compare results for a fixed golden dataset and all existing test cases.
- If writes are introduced, use an explicit outbox/dual-write adapter with idempotency and reconciliation. Do not dual-write arbitrary SQL from two applications.
- Monitor drift and queue lag for at least one full campaign-like test cycle.

## Phase 7 — cutover
- Reduce DNS TTL in advance.
- Announce a short write freeze for the final delta.
- Pause ingestion and all write-producing jobs.
- Export final delta and import it into target.
- Reconcile final counts/checksums.
- Switch API and frontend origin.
- Run health, auth, search, route, admin and worker smoke tests.
- Keep legacy database read-only and preserve old deployment for rollback.

## Phase 8 — rollback
Rollback if any critical invariant fails: data mismatch, unauthorized access, failed route calculations, queue loss, document loss, payment inconsistency or unacceptable latency.

- Repoint frontend/API to old origin.
- Re-enable legacy workers only after confirming no duplicate processing.
- Preserve target database for forensic comparison.
- Do not attempt reverse sync automatically unless a tested reverse path exists.

## Decommission gate
Keep legacy Supabase and Vercel resources for at least 30–60 days after accepted cutover, subject to retention/legal requirements. Decommission only after restore tests, owner sign-off, no pending writes, no required shared AI Factory/GI dependencies and a documented export/archive. The shared Supabase project must not be deleted as part of a PROIDU migration.