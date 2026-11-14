# Live schema inventory

Run 00_live_inventory.sql against the current Supabase project using a read-only SQL role or the SQL Editor.

The script is read-only. It returns one JSON document containing:
- PostgreSQL version, public table count and migration count;
- installed extensions;
- public tables and RLS state;
- columns, constraints and indexes;
- RLS policies and public function execution grants;
- Auth user/identity/session counts;
- storage bucket metadata;
- selected PROIDU data counts.

## Required backup artefacts

This SQL inventory is not a database backup and does not replace pg_dump.

Before generating a target migration, obtain:
1. provider-native full backup and a tested restore;
2. pg_dump custom-format backup;
3. schema-only dump;
4. selective PROIDU allowlist data dump;
5. separate storage object inventory and object checksums;
6. deployed Edge Function source and version hashes.

Do not commit data dumps, PII, tokens, database URLs or secret values to GitHub. Commit only schema artefacts after removing secrets and personally identifying data, plus counts/checksums and reviewed migration SQL.

The live project is shared with AI Factory and Government Intelligence. The allowlist in docs/proidu-4.0/15_SCHEMA_EXTRACTION.md must be reviewed before export.