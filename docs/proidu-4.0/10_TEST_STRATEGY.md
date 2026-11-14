# 10. Test strategy and release gates

## Unit tests
- EGE score aggregation and subject matching.
- Alternate entrance exam groups and priority rules.
- SPO diploma profile matching and internal exam branches.
- Budget, paid, target, special and separate quota logic.
- Minimum score vs historical cutoff distinction.
- Deadline/timezone calculation.
- Foreign qualification and recognition rule versioning.
- Document checklist by applicant category and country.
- Source freshness and evidence invalidation.
- Currency conversion and payment amount normalisation if payments are enabled.

## Integration tests
- PostgreSQL 17 migrations on a clean database.
- Constraints, indexes, triggers and foreign keys.
- Role/grant/RLS tests for public, applicant, staff, reviewer and admin roles.
- RabbitMQ retry, ack, dead-letter and duplicate message handling.
- S3 upload, signed URL expiry, object versioning and checksum verification.
- OIDC and Telegram identity verification.
- API OpenAPI contract validation.

## Ingestion tests
- One golden HTML/PDF source per parser family.
- Content hash and change detection.
- Idempotent reprocessing.
- Broken source, redirect, 403, 404, 429, timeout and malformed PDF.
- LLM extraction with low confidence must enter manual_review.
- No publication without a source version and evidence locator.
- Source change invalidates dependent facts and triggers re-verification.

## End-to-end tests

Russia:
- applicant enters EGE scores and receives ranked routes;
- applicant receives explanation and source links;
- incomplete data is visibly marked;
- paid and target routes do not disappear behind a budget-only filter;
- SPO applicant receives profile-specific route and correct internal exam requirements.

Global:
- applicant selects country and qualification;
- system returns country-specific checklist;
- quota, treaty and paid pathways remain distinct;
- uncertain recognition goes to human review;
- applicant case moves through stages with audit history;
- official portal submission is linked, not simulated.

Operations:
- deploy new image;
- roll back to previous image;
- restore database from backup;
- recover a failed worker and replay a job without duplicates;
- rotate secrets without downtime.

## Security tests
- unauthenticated admin/source-bootstrap calls fail;
- forged Telegram initData fails;
- replayed webhook/event is idempotently rejected;
- payment amount, currency, product and invoice ownership mismatch fails;
- SQL injection and search resource-exhaustion tests;
- SSRF protections on source fetcher;
- upload content-type, size and malware checks;
- private documents cannot be fetched without authorisation;
- applicant A cannot read applicant B's case;
- logs contain no passport number, document body or auth token.

## Migration acceptance
For each allowlisted table: exact row count match, deterministic checksum match, no orphaned foreign keys, no unexpected null increase, all unique constraints pass, all sequences/defaults work, object counts/SHA-256 match, and old/new search/route outputs match the golden set.

## Release gates
A release cannot ship unless build, lint, typecheck and unit tests pass; integration and end-to-end tests pass; no P0 security issue is open; migration checks pass; source coverage report is generated; rollback artefact exists; production health and backup status are green.

Suggested performance targets for the first public release: p95 search API under 700 ms for cached/common queries, p95 route calculation under 1.5 s for normal applicant profiles, no unbounded database queries, and no queue backlog growth under the agreed load test. Rebaseline after realistic load testing.