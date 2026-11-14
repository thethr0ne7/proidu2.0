# Database migrations

This directory is reserved for the new provider-neutral PostgreSQL migration history.

Do not copy the 132 Supabase migration records into this directory and do not treat the two SQL files in the current GitHub repository as a full production baseline.

The first runnable migration must be generated only after:
1. exporting the actual live schema;
2. approving the PROIDU table/function allowlist;
3. separating AI Factory and Government Intelligence ownership;
4. validating target PostgreSQL 17 extension compatibility;
5. reviewing the target data model and migration map.

See docs/proidu-4.0/08_MIGRATION_RUNBOOK.md and 15_SCHEMA_EXTRACTION.md.