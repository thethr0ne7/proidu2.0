# PROIDU 4.0 | Engineering execution ledger (2026-11-15)

## Hard boundaries
- Branch: audit/proidu-4-timeweb-2026-11-14. Base main untouched, draft PR #3.
- No actual production traffic switch, no source deletion, no source DDL/DML.
- No Timeweb managed DB/VPS was provisioned. The authenticated Timeweb project 3186247 has **0 RUB** balance and no services. Never report a running Timeweb staging endpoint until it exists.
- Avoid storing a Supabase full schema dump, data dump, secrets, applicant records, and worker outputs in this PUBLIC GitHub repository.
- A private Google Docs schema CATALOG (not a pg_dump or backup) was assembled for the owner: https://docs.google.com/document/d/1DpLbmthMb0DPiu1dkeA6nObjiTRMlO1Z1ioT08ZwehQ/edit

## Data inventory checkpoints (read-only at 2026-11-15)
- Source: PostgreSQL 17.6 in Supabase project hgivyjjethjwswjrvroy, shared among PROIDU, Government Intelligence and AI Factory.
- Public tables: 139 (prefix-based groups do not prove legal ownership).
- Catalog: 89 regions, 751 institutions including 252 branches, 82 admission-year 2026 programs, 361 exam requirement rows, 80 admission offer records.
- Queues: 11,221 ingestion_queue rows (11,190 pending); 6,008 ingestion_jobs rows queued. **Do not auto-enable the collector on this backlog** without deduplication, queue draining and load/rate control.
- Private storage bucket gi-project-documents belongs to a separate system, never migrate with PROIDU.
- The full private schema-only SQL export can be created on an authorized trusted host with scripts/export_supabase_full_schema.sh, PostgreSQL 17/18 client and local PostgreSQL service/pgpass files. This has NOT been executed. The actual owner must also run a full source disaster-recovery backup and verify restore before moving real data.
- Existing automated Supabase daily backups are not guaranteed on Free; do not assume a snapshot exists.

## Canonical architecture: ONE of each service
| Concern | Canonical path | Execution gate |
|---|---|---|
| Bounded source -> staging JSON capture | services/etl/capture.py | Needs private PG17 target and verified backup |
| Approved catalog promotion | services/etl/capture.py | Reconcile first; explicit staging approval |
| MAI parser | services/workers/mai.py | Pinned official fixture, no auto-verified records |
| Worker/job executor | services/workers/runner.py | Docker Compose profile collectors, disabled by default |
| Ingestion, Global and Factory schema | data/migrations/0003_import_collect_global.sql | Clean PostgreSQL 17 only |
| Source-compatible historical PROIDU registry tables | data/migrations/0003_proidu_legacy_ingestion.sql | Evaluate against source DDL before loading |
| Foreign applicants to Russian institutions | data/migrations/0005_foreign_applicants.sql | Legal-source review, country/year scoping |
| AI Factory bridge | services/api/factory_bridge.py | Private network, signed messages, separate writer |
| Web/API | apps/web and services/api | CI green; staging load tests outstanding |

### Critical interpretation: Global
Global means foreign applicants applying to Russian universities/colleges. This is NOT an international catalogue of foreign universities. Admission rights must be keyed by nationality, admission campaign, educational level, institution and verified rule source. Default 'unknown' must not be displayed as eligibility.

### AI Factory integration
The AI Factory remains its own service and data store. Bridge schemas and signed internal response handler are prepared; **this is NOT a live API connection**. The factory can propose evidence or return classification, never self-authorize VERIFIED admissions rules. Need private connectivity, HMAC key, restricted DB role, operator-approved source registration, audit and threat review.

### Data migration gates
1. Read-only full pg_dump schema + separate whole-source DR backup; store privately/encrypted, perform restore drill.
2. Inspect actual source PK/FK, sequences, triggers/views, functions and permissions; compare against target migration, resolve every mismatch.
3. Create **staging** managed PostgreSQL 17, private network and VPS after explicit cost/billing approval.
4. Apply 0001, 0002, 0003_import, 0003_proidu_legacy, 0005 migrations to empty target, run CI against same major version.
5. Capture with isolated REPEATABLE READ source transaction, validate row count + SHA-256, reconcile and promote only catalog tables with reviewed mapping.
6. Handle foreign applicant / payment / auth data separately; do not treat unrelated app tables as PROIDU.
7. Start the worker with a single manually verified MAI source and raw snapshot archival; unknown source format quarantines rather than publishes.
8. Stage the Global source inventory and AI Factory bridge with human approval only; no broad internet crawling without source registry & rate limits.
9. Shadow-read against existing public Supabase responses, test 89-region catalog, search/route >500 candidates, SPO verified-only, and arbitrary invalid input.
10. Before cutover: private encrypted backups, rollback runbook, stable credentials, monitoring/alerts, authorization, 2FA, WAF/rate limits, load tests, data consistency checkpoint.
11. Production switch only on operator release approval; keep source read-only as contingency until reconciliation is signed.

## Timeweb price and region facts, not a purchase order
Timeweb Cloud project 3186247 is authenticated, presently empty with 0 RUB balance and a recommendation to enable account 2FA.
Managed PG17 Moscow premium NVMe 1CPU/2GiB/20GB: 2,000 RUB/month; daily DB backups: 120 RUB/month from observed form.
VPS *Ultra* Moscow 2CPU/4GiB/50GB: 5,280 RUB/month. A previous lower-priced VPS option was a different instance class; **do not mix their unit prices**. Confirm shared CPU or custom plans, network/IPv4 and tax in the console before ordering.
The earlier 2,849 RUB all-in figure is **not a firm deployable quotation**. There is no funded deployment.

## CI
Each new commit creates backend, frontend and infrastructure GitHub Actions jobs. A GREEN CI proves disposable PG17 migrations and software tests, not verified physical Timeweb provisioning or production readiness.
