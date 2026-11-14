# 11. Security and risk register

## P0 — must be closed before production traffic

### Public privileged functions
Several deployed Edge Functions have verify_jwt=false. For the PROIDU core, federal-source-bootstrap, search, route, coverage, university-request and telegram-payments require a function-by-function access decision. Public search can remain public only with strict input validation, rate limits, query caps and no privileged write path. Administrative ingestion must require staff authentication and a server-side secret.

### Telegram payment handler
The current deployed handler is not acceptable for money movement. Rebuild it with webhook secret verification, provider event validation, invoice ownership, exact expected amount/currency/product validation, idempotency keys, duplicate event handling and a reconciliation job. Keep the payment feature disabled until tests pass.

### Service credentials
No service-role/database admin credential may be shipped to a browser or Telegram Mini App. Runtime roles are split into read-only public catalogue, applicant case access, staff operations, ingestion worker and migration administrator.

### Shared database boundary
Do not migrate or delete AI Factory/Government Intelligence data as part of PROIDU. The current database is shared and contains 133 public tables and 132 migrations.

## P1 — before federal-scale launch
- PII isolation, access logs and retention policy.
- Encryption at rest and in transit; document-level access controls.
- Signed URLs with short expiry for private documents.
- SSRF controls for ingestion workers: block metadata IPs, private IP ranges and unsafe redirects.
- Per-domain crawl budgets and robots/terms review.
- Rate limits by IP, user and API key.
- Audit log for all manual verification and rule changes.
- Backup restore drills and incident response.
- Dependency scanning, secret scanning, container scanning and SBOM.
- Multi-factor authentication for admin/reviewer roles.

## Personal data
152-FZ article 18(5), as amended by Federal Law 23-FZ, requires Russian citizens' personal data collected online to be initially recorded and stored in databases located in Russia, subject to statutory exceptions. Cross-border transfer is a separate issue under article 12. The system must be designed with a Russian primary data plane for Russian citizens and a country-by-country legal assessment for Global applicants.

Provider claims about 152-FZ do not replace the operator's own legal assessment, privacy notice, consent management, processing contracts, access controls and security measures.

## Risk register

| Risk | Severity | Mitigation |
|---|---|---|
| Wrong admission rule produces false eligibility | Critical | Versioned rules, evidence, human review and golden tests |
| Incomplete data presented as confirmed | Critical | Route-ready gate and visible completeness |
| Source website changes silently | High | Content hashes, source versions and recrawl events |
| Shared Supabase data accidentally copied/deleted | Critical | Explicit allowlist, isolated target and no destructive changes |
| Telegram identity spoofing | High | Server-side initData verification and replay controls |
| Payment spoofing | Critical | Rebuilt signed webhook and provider reconciliation |
| Russian users cannot reach foreign edge/CDN | High | Russian origin and multi-network connectivity tests |
| International diploma wrongly classified | High | Country rules and manual recognition review |
| One source blocks ingestion queue | Medium | Per-source budgets, retries and dead-letter queue |
| Vendor lock-in | Medium | PostgreSQL, S3 API, AMQP, Docker and OpenAPI abstractions |