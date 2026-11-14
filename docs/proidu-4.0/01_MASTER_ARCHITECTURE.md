# 01. PROIDU 4.0 — master architecture

## Product definition
PROIDU is a federal admissions intelligence and applicant workflow platform. It is not an official admissions authority and must not present inferred or incomplete data as a university decision.

## Shared core
- Institution and branch registry.
- Program catalogue and admission campaigns.
- Source registry, archived source versions and field-level evidence.
- Versioned legal rules and deterministic eligibility engine.
- Applicant identity, consent and case workflow.
- Search, ranking, route explanation and audit history.
- Admin console for data verification and exception handling.
- Ingestion workers and controlled AI extraction.

## Product surfaces

**PROIDU Russia**
- EGE applicant route.
- SPO graduate route, including profile match and university-specific entrance exams.
- Bachelor, specialist, master and later postgraduate routes.
- Budget, paid, target and special quota pathways.
- Individual achievements, exam combinations, deadlines, required documents, tuition and historical cutoffs.

**PROIDU Global**
- Foreign applicant onboarding by citizenship, residence and education country.
- Recognition/equivalence pre-checks for foreign qualifications.
- Russian government quota, international treaty, paid admission and university-specific pathways.
- Language requirements, entrance exams, documents, translation/legalisation, invitation, visa and arrival workflow.
- Human case manager workflow and university partner workspace.

The two surfaces share institutions, campuses, programs and source evidence. They do not share one generic admission algorithm: each route is selected by a versioned legal and institutional rule set.

## Target architecture
- React/Vite web applications for Russia, Global, Telegram Mini App and administration.
- TypeScript modular-monolith API, initially one deployable application.
- Separate ingestion and verification workers.
- PostgreSQL 17 as the system of record.
- RabbitMQ for durable ingestion and workflow jobs.
- Valkey for cache, rate limits and short-lived sessions only.
- S3-compatible storage for source snapshots, PDFs and applicant uploads.
- OpenAPI contracts for every public and internal API.
- Prometheus/Grafana, structured logs, error tracking and audit events.
- Docker images and infrastructure-as-code.

Do not split into dozens of microservices at the beginning. Separate modules and worker processes first; extract services only when independent scaling, security boundaries or release cadence justify it.

## Data trust model
Every important displayed fact must have source URL, source authority, archived source version and content hash, observation timestamp, admission year/effective period, field-level evidence locator, extraction method/parser version, verification status and reviewer when manual review is required.

LLM output is a candidate extraction, never a publish decision. A field becomes verified only after deterministic validation against the official source or human review. If required fields are missing or stale, the route is labelled incomplete and cannot claim confirmed eligibility.

## Product invariants
1. One institution identity across all product surfaces.
2. Branches and campuses are explicit entities, not duplicated universities.
3. Admission data is campaign-specific and never silently reused from another year.
4. Legal rules are versioned with valid-from/valid-to dates.
5. Budget, paid, target and special quota are separate admission bases.
6. Historical cutoffs are not minimum entrance scores and must be labelled separately.
7. No fabricated places, cutoffs, tuition, deadlines or recognition outcomes.
8. No government API is assumed to exist. Official submission remains on the authorised portal or university channel unless written API access is obtained.

## First release boundary
The first PROIDU 4.0 release is a safe replacement for the current Russian applicant search and route engine, backed by a clean data core. Global is built as a separate vertical on the same catalogue, but its case-management and country rules are introduced in controlled increments. Neither product may advertise full federal or worldwide coverage until the coverage gates in 06_FEDERAL_COVERAGE.md are met.