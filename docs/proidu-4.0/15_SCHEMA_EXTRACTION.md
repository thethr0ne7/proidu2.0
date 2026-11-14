# 15. Schema extraction and migration baseline

## Why the current GitHub SQL is insufficient
The proidu2.0 repository contains two SQL migration files; neither migration name appears in the live ledger. The separate ai-platform-core repository contains 58 migration SQL files, of which 49 names match the live ledger and 9 are not present in it. The live Supabase project reports 132 migrations and 133 public base tables; 83 live migration names are not represented in ai-platform-core. The history is distributed across repositories and likely includes manually applied or other-source migrations. Replaying any one repository's migration folder will not reproduce production.

## Required source artefacts
From a read-only database connection, collect:
- PostgreSQL version and server settings relevant to compatibility;
- schema-only dump for all schemas;
- selective schema-only dump for the approved PROIDU objects;
- data dump for the approved table allowlist;
- table/column inventory;
- PK, FK, unique and check constraints;
- indexes and views;
- functions, triggers and RLS policies;
- role grants and default privileges;
- extension inventory and extension versions;
- cron jobs and external network calls;
- storage bucket and object inventory;
- deployed Edge Function source and version hashes;
- environment variable names and secret ownership, never secret values.

Use a custom-format dump and checksum artefacts. Do not commit production data, PII, access tokens or connection strings to GitHub.

## PROIDU allowlist draft
Core candidates:
- regions
- institutions
- programs
- admission_offers
- exam_sets
- exam_requirements
- cutoff_history
- admission_deadlines
- required_documents
- individual_achievement_rules
- sources
- institution_source_registry
- source_registry
- source_snapshots
- extraction_evidence
- ingestion_jobs
- ingestion_queue
- ingestion_runs
- coverage_snapshots
- institution_monitoring_metrics
- validation_issues
- platform_data_versions and platform_ingestion_jobs only after ownership/dependency review

Conditional:
- university_check_requests (currently empty; contains contact/Telegram-oriented columns).
- payment_intents (currently empty; retain only if the new billing module needs it).

Explicitly excluded by default:
- all af_* tables;
- all gi_* tables;
- GI project documents and source documents;
- Telegram AI Factory workspaces and agent runtime;
- shared venture/evolutionary agent tables;
- shared Government Intelligence evidence and policy data.

## Extension compatibility
Source extensions:
- pg_trgm, pgcrypto: target equivalents expected; verify exact versions.
- PostGIS: target provider advertises support; add only if required.
- unaccent: verify provider support or implement tested normalisation.
- uuid-ossp: replace with PostgreSQL native UUID generation where possible.
- pg_cron: replace with worker scheduler.
- pg_net: replace with application HTTP client.
- supabase_vault: replace with provider secret manager/Vault.
- hypopg and index_advisor: keep only in DBA/development tooling if available.
- pg_stat_statements: enable only if supported and permitted by provider.
- plpgsql: built into PostgreSQL.

## Output
The result of this phase is a reviewed, reproducible baseline migration and a machine-readable mapping manifest. Compare live migration names with both proidu2.0 and ai-platform-core before approving the allowlist. Archive the complete ai-platform-core migration folder as reference, but do not replay its AI Factory/GI migrations into the PROIDU database. It is not acceptable to invent SQL from partial snippets or to run the new migration against the existing Supabase production database.