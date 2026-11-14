# 14. Live data snapshot

Observed on 2026-11-14 from the connected Supabase project. Counts are a point-in-time snapshot and will change as ingestion runs.

## Database and platform
- PostgreSQL 17.6.
- 133 public base tables.
- 132 recorded migrations.
- Shared Supabase project includes PROIDU, AI Factory and Government Intelligence.
- Supabase Auth: 0 users, 0 identities, 0 sessions.
- PROIDU university_check_requests: 0.
- payment_intents: 0.
- source_snapshots: 0.
- Storage bucket: gi-project-documents (private), owned by another workflow.

## PROIDU catalogue

| Dataset | Rows |
|---|---:|
| Regions | 89 |
| Institutions | 751 |
| Programs | 82 |
| Verified 2026 offers | 80 |
| Verified 2026 exam sets | 82 |
| Exam requirements | 361 |
| Verified 2025 cutoff records | 8 |
| Verified 2026 deadlines | 34 |
| Partial 2026 deadlines | 3 |
| Verified required documents | 22 |
| Verified achievement rules | 20 |
| Sources | 27 |
| Source registry | 88 |
| Ingestion jobs | 6,008 |
| Ingestion queue | 11,221 |
| Coverage snapshots | 2 |

Only 11 institutions had verified program records in the inspected join, approximately 1.46% of the 751-institution inventory. No 2027 program/offering rows were found. This is the current coverage gap, not a complete national catalogue.

## Queue
- 30 official_site queue rows are failed.
- 721 official_site queue rows are pending.
- Other source kinds are pending in large batches.
- One 2025 monitoring item is marked needs_review.
- Queue completion and failure must be measured by institution and source kind.

## Shared-system data excluded from PROIDU migration
- 1,445 Government Intelligence source documents.
- 14 Government Intelligence project documents.
- 37 Government Intelligence official sources.
- Numerous af_* and gi_* tables and functions.

These remain with their owning system unless a separate migration project is approved.