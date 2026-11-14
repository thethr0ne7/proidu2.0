# 12. Delivery roadmap

## Phase 0 — control and evidence
- Freeze production changes.
- Consolidate source snapshots.
- Export live schema and deployed function versions.
- Close or isolate P0 public-function risks.
- Agree the PROIDU data allowlist and data ownership boundary.
Exit: complete inventory, verified backups, no unknown production dependency.

## Phase 1 — monorepo and local platform
- Establish root workspace and lockfile.
- Add Docker Compose for local PostgreSQL 17, RabbitMQ, Valkey and S3-compatible storage.
- Add API skeleton, OpenAPI and health endpoints.
- Port current scoring and route logic behind tests.
- Add CI with required checks.
Exit: one-command local startup and green CI.

## Phase 2 — replacement infrastructure
- Provision Russian-region managed PostgreSQL 17.
- Provision private network, app/worker VMs, S3, RabbitMQ and Valkey.
- Add secrets, logs, metrics, backup and restore.
- Deploy a staging API and frontend.
Exit: staging deployment reproducible from Git commit.

## Phase 3 — Russia core
- Migrate catalogue and current verified 2026 data.
- Build 2027 campaign data model.
- Implement campaign-aware search and route API.
- Implement paid and target routes.
- Add data coverage dashboard and manual verification console.
Exit: Russia search/route passes golden tests and source coverage gates.

## Phase 4 — federal data factory
- Enumerate active licensed institutions and branches.
- Discover official admission sources.
- Ingest programs, seats, exams, fees, deadlines and documents.
- Process source changes and failed queues.
- Human-review conflicts and high-impact facts.
Exit: reproducible national coverage report; no claim of full coverage before acceptance.

## Phase 5 — SPO
- Build classification dictionary and mappings from SPO specialties to higher education fields.
- Model profile/non-profile admission and institution-specific exam rules.
- Add diploma and transcript intake.
- Test against official admission rules.
Exit: SPO routes work from source evidence, not a generic guessed mapping.

## Phase 6 — Global MVP
- Select 3–5 pilot markets based on demand and partner capacity.
- Build country/qualification intake.
- Build quota/treaty/paid route distinctions.
- Add country-specific document and language matrices.
- Add case manager and university partner workflow.
Exit: end-to-end test cases for each pilot market.

## Phase 7 — cutover and scale
- Migrate the internal AI Platform Core Next.js application off Vercel as a separate service after its routes and AI Factory/GI dependencies pass inventory.
- Keep its SSO boundary and verify all internal workflows before retiring the Vercel deployment.

## Phase 8 — cutover and scale
- Complete zero-loss migration and dual-run.
- Switch frontend/API origin.
- Keep legacy services read-only for the rollback window.
- Load test, tune PostgreSQL and workers.
- Consider Yandex Cloud or Kubernetes only when operational evidence justifies it.

## Suggested order
Do not start by building the Global UI or adding AI agents. First secure the live system, reconcile data and establish the canonical API/data model. Federal coverage is a data operations problem as much as a software problem.