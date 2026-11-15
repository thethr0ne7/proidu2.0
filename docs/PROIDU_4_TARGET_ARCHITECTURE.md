
# PROIDU 4.0 | Целевая архитектура
Статус: проектирование, не реализовано.

## Принципы
1. Единый GitHub монорепозиторий: временно thethr0ne7/proidu2.0. Не перезаписывать другой thethr0ne7/proidu без сравнительного аудита.
2. Канонический логический PostgreSQL, резервные копии и тест восстановления, приватная сеть и RBAC.
3. Собственный Backend (FastAPI), queue worker (Dramatiq/Celery), scheduler, Redis/Valkey, S3-compatible snapshots.
4. Web + Telegram Mini App через API без прямых privileged database calls.
5. Контуры RU-HE / RU-SPO / INTERNATIONAL с едиными организациями и особыми правилами поступления.
6. Timeweb Cloud — кандидат для хостинга, а не утверждённая смета. Нужны актуальные тарифы, тип БД, backup/PITR, доступность региона и требования локализации ПД.

## Предлагаемая структура
~~~text
apps/web/                 React web и Mini App shell
apps/admin/               оператор проверки источников
services/api/             Python FastAPI / OpenAPI / authentication
services/worker/          background ingestion / validation
services/scheduler/       periodic source refresh
packages/contracts/       versioned API schemas / TS types
packages/admission-rules/  year/track/country-specific eligibility
data/migrations/          ordered PostgreSQL migrations
data/source-adapters/     official source parsers
data/fixtures/            DEMO ONLY, never production facts
infra/docker/             development and staging orchestration
infra/terraform/          reproducible cloud configuration
infra/monitoring/         metrics, traces, alerts
infra/backups/            tested restore runbooks
tests/{unit,integration,e2e,load,security,migration}/
docs/                    ADRs, source evidence, law, operations
~~~

## Базовая модель данных
Organizations, branches (parent FK), sources and immutable snapshots; programs; admission_campaigns; exam_sets/exam_requirements; admission_offers; deadlines; cutoffs; institutions rules; applicant categories; source-linked claims with effective dates.
Separate SPO specialties, SPO-to-HE mappings and university internal exam eligibility rules. International legal rules by citizenship, prior education country, degree recognition, admission basis, visa/migration path and validity date.
Private applicant/agent/application/consent data separated by scopes and encrypted.

## DATA FACTORY
DISCOVER -> FETCH -> SNAPSHOT -> PARSE -> NORMALIZE -> CROSS-CHECK -> REVIEW -> PUBLISH -> EXPIRE.
Each fact has official URL, snapshot hash, fetched_at, effective period, parsing version, validation ID, reviewer, publication state. LLM only proposes extractions; official/legal facts must be source-verified. Respect robots, terms, rate limits, no inaccessible API assumptions.

## Security and release
Server validates Telegram initData HMAC and freshness; web auth + roles; least privilege; rate limits; structured logs and secret management. Payments off until authenticated updates, ledger and refunds.
CI: dependency pinning, lint/types/unit, integration DB, migration tests, SAST/secret scans, build, staging smoke, tested backups, release approval. Canary/traffic switch plus rollback (with reconciliation of any new writes).
