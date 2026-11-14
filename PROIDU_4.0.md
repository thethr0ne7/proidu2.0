# PROIDU 4.0 — engineering package

Status: architecture and migration blueprint. This branch does not modify production Supabase, Vercel, DNS or existing main branches.

## Decisions
1. Use proidu2.0 as the canonical repository base. Keep the current application and Supabase integration intact until the replacement passes acceptance tests.
2. Preserve the other source repositories under legacy snapshots in this branch.
3. Build one monorepo with a shared catalogue and two product surfaces: PROIDU Russia and PROIDU Global.
4. Replace Supabase with managed PostgreSQL 17 + application-owned API/workers + S3-compatible storage + RabbitMQ/Valkey.
5. Replace Vercel with containerised deployment on Russian infrastructure. Timeweb Cloud is the primary candidate; Yandex Cloud is the scale-up alternative.
6. Do not migrate the whole shared Supabase project. It contains 133 public tables and 132 migrations across PROIDU, AI Factory and Government Intelligence.
7. Do not generate a fake production migration from the two SQL files in GitHub. First export and reconcile the live schema.

## Documents
- docs/proidu-4.0/01_MASTER_ARCHITECTURE.md — product and system boundaries.
- docs/proidu-4.0/02_HARD_AUDIT.md — observed defects and current-state evidence.
- docs/proidu-4.0/03_REPOSITORY_MAP.md — canonical monorepo and source consolidation.
- docs/proidu-4.0/04_INFRASTRUCTURE.md — replacement for Supabase and Vercel.
- docs/proidu-4.0/05_DATA_MODEL.md — shared catalogue, Russia and Global domains.
- docs/proidu-4.0/06_FEDERAL_COVERAGE.md — national source inventory and coverage gates.
- docs/proidu-4.0/07_INTERNATIONAL_BRANCH.md — foreign applicant workflow.
- docs/proidu-4.0/08_MIGRATION_RUNBOOK.md — zero-loss migration and rollback.
- docs/proidu-4.0/09_FILE_LEVEL_FIXES.md — exact files and required changes.
- docs/proidu-4.0/10_TEST_STRATEGY.md — engineering and acceptance tests.
- docs/proidu-4.0/11_SECURITY_AND_RISKS.md — threat model and release blockers.
- docs/proidu-4.0/12_ROADMAP.md — delivery phases.
- docs/proidu-4.0/13_LEGAL_SOURCES.md — legal and official source register.
- docs/proidu-4.0/14_LIVE_DATA_SNAPSHOT.md — observed database metrics.
- docs/proidu-4.0/15_SCHEMA_EXTRACTION.md — how to produce the real migration baseline.
- docs/proidu-4.0/16_AI_PLATFORM_CORE_INTEGRATION.md — Vercel inventory, MAI worker audit and shared-platform boundary.

## Source snapshots
- legacy/proidu — frozen copy of the standalone PROIDU repository.
- legacy/proidu-bot1.1 — frozen copy of the Telegram/static prototype.
- legacy/ai-platform-core-proidu — frozen copy of the PROIDU-specific MAI vertical and its direct test/persistence dependencies.
- proidu-bot — source repository was empty at audit time.
- Current proidu2.0 files remain at repository root and under apps/web, docs, scripts and supabase.

## Non-negotiable migration rule
No production table, function, bucket, DNS record, secret or deployment is deleted or overwritten during the blueprint phase. The old system remains available until the new stack passes data reconciliation, security, functional and rollback checks.