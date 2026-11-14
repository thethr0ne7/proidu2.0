# 16. AI Platform Core and Vercel integration audit

Audit date: 2026-11-14. The connected Vercel account has one project, ai-platform-core, linked to the GitHub repository thethr0ne7/ai-platform-core. This is not the proidu2.0 frontend project, but the repository contains PROIDU-specific ingestion code and shares the Supabase platform.

## Vercel facts

- Vercel team has one linked project: ai-platform-core.
- Project framework: Next.js.
- Git repository: thethr0ne7/ai-platform-core.
- Project root directory in .vercel/project.json: apps/web.
- Current project metadata reports live=false, SSO protection enabled for all non-custom domains, and only vercel.app domains.
- Eight recent deployments were returned; the latest production deployment is READY.
- This is an internal AI Platform Core/AI Factory web application, not a public PROIDU admissions frontend.
- Do not delete or pause this project during the PROIDU migration. Other AI Platform Core and Government Intelligence workflows are present.

## PROIDU-specific code inside AI Platform Core

The repository contains:
- src/proidu-mai.ts — parser and deterministic validation for one official MAI admissions page, admission year 2026.
- src/proidu-mai-worker.ts — scheduled-worker implementation using Supabase service-role persistence.
- src/adapters/proidu.ts — validates a small EGE/SPO query envelope but routes it to system.echo; it is not a real admissions-search integration.
- src/supabase-persistence.ts — Supabase PostgREST adapter for ingestion jobs, data versions, evidence and source checkpoints.
- test/proidu-mai*.test.ts and test/supabase-persistence.test.ts — fixture and mocked-adapter tests.
- docs/PROIDU-MAI-*.md and docs/SUPABASE-PERSISTENCE.md.
- migrations 0001_proidu_ingestion.sql and 0002_platform_ingestion_namespace.sql.

The MAI slice proves a single-source parser/version/evidence path. It is not a federal crawler, does not cover other universities, and is hard-coded to 2026. Its publication policy allows automatic publication after one evidence item and deterministic validation; federal deployment must add risk-based human review for seats, exams, deadlines, fees and legal rules.

## MAI worker is not proven live

The scheduled-worker document describes a GitHub Actions cron, but the inspected ai-platform-core repository has no .github/workflows files. The worker's migration 0001_proidu_ingestion.sql is not recorded in the live Supabase migration ledger.

Live Supabase inspection found:
- platform_ingestion_jobs, platform_data_versions, platform_evidence_records and platform_source_checkpoints exist;
- data_versions, evidence_records and source_checkpoints do not exist;
- claim_platform_ingestion_job exists;
- claim_ingestion_job does not exist.

The worker as written calls claim_ingestion_job and writes to the non-platform table names. Therefore it cannot be treated as a proven live worker against the inspected database. The 0002_platform_ingestion_namespace migration is represented in the live ledger as platform_ingestion_namespace and its platform_* tables exist.

## Migration-history mismatch

- Live Supabase ledger: 132 migration records.
- ai-platform-core repository: 58 migration SQL files.
- 49 migration file names match live migration names.
- 9 repository migration files are not present in the live ledger.
- 83 live migration names are not represented in ai-platform-core.
- proidu2.0 contains two SQL migration files whose names are not present in the live ledger.

This is a migration-source-of-truth defect. It does not prove that all missing SQL was manually applied; some may exist in other repositories or deployment history. Reconstruct from the live schema and migration ledger, not by replaying a partial folder.

## Correct integration boundary

1. Extract the PROIDU-specific MAI parser, worker contracts and tests into services/ingestion/adapters/mai.
2. Replace the Supabase persistence adapter with the new PostgreSQL repository interface.
3. Replace the one-source fixed MAI requirement with a source registry and campaign-aware university adapters.
4. Keep the generic AI Platform Core orchestration engine separate until its other product dependencies are mapped.
5. If the entire AI Platform Core is also leaving Vercel, migrate it as a separate containerized service to the same Russian infrastructure. Do not merge its entire 281-file repository and all shared AI Factory/GI migrations into PROIDU's database.
6. Preserve the internal SSO boundary on the replacement host using OIDC/Keycloak, VPN or an authenticated reverse proxy.

## Vercel exit sequence for AI Platform Core

- Confirm all production routes, environment variable names, Edge Function calls, storage usage, domains, scheduled jobs and external callbacks.
- Build the Next.js app from apps/web as a Docker image.
- Determine whether src/server.ts is deployed or run separately; the Vercel project root is apps/web, so do not assume the root Node server is part of the Vercel deployment.
- Move API and worker processes into explicit containers.
- Replace Supabase SDK calls with the new API client.
- Deploy to Russian-region staging and test SSO, uploads, project documents, Government Intelligence and all production routes.
- Run shadow traffic and restore tests.
- Cut over only after owner sign-off; keep Vercel available for rollback for 30–60 days.
