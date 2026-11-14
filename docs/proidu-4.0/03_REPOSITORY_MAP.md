# 03. Repository consolidation map

## Canonical location
Use the existing proidu2.0 repository as the migration base because it contains the current React/Vite application and Supabase integration. This blueprint is isolated on branch proidu-4.0/engineering-blueprint. Do not replace main during this phase.

The branch adds frozen snapshots of proidu, proidu-bot1.1 and the PROIDU-specific vertical slice from ai-platform-core under legacy/. The empty proidu-bot repository contributes no source files. The current proidu2.0 application remains at its existing paths until the replacement API is ready. The generic AI Platform Core is a separate shared service and is not copied wholesale.

## Target monorepo
- apps/russia-web — current apps/web after API client conversion.
- apps/global-web — international applicant portal.
- apps/telegram-miniapp — merged Telegram surface from bot1.1.
- apps/admin — source review, institution operations and applicant case management.
- services/api — modular API: identity, catalogue, admissions, routes, global admissions, cases, billing, admin.
- services/ingestion — crawlers, document fetchers, parsers and source adapters.
- services/verification — deterministic validators, evidence review queue and publication gates.
- services/notifications — email, Telegram and operational notifications.
- packages/domain — shared types and domain invariants.
- packages/contracts — OpenAPI schemas and generated clients.
- packages/rules-engine — versioned admission and recognition rules.
- packages/source-adapters — source-specific parsers and normalisers.
- db/migrations — new provider-neutral PostgreSQL migrations.
- db/legacy — source schema exports and mapping artefacts.
- infra/docker — local development and deployment images.
- infra/terraform — provider resources, secrets references, networking and backups.
- docs/proidu-4.0 — architecture, audit, operations and acceptance documents.
- legacy — immutable source snapshots; never deployed.

## Source-to-target map

| Existing source | Destination | Action |
|---|---|---|
| proidu2.0/apps/web | apps/russia-web | Keep and migrate API calls |
| proidu2.0/supabase/functions/search | services/api/admissions/search | Port logic, add auth/rate limits |
| proidu2.0/supabase/functions/route | services/api/admissions/routes | Port after contract tests |
| proidu2.0/supabase/functions/telegram-payments | services/api/billing/providers/telegram | Rebuild; do not copy unsafe handler |
| proidu2.0/supabase/functions/search/scoring.ts | packages/rules-engine | Extract pure scoring logic |
| proidu2.0/supabase/migrations | db/legacy/supabase | Archive; not a complete live baseline |
| proidu2.0/apps/web/src/lib/telegram.ts | apps/telegram-miniapp + API identity | Verify Telegram initData on server |
| proidu-bot1.1/assets | apps/telegram-miniapp | Reuse only after code review and refactor |
| proidu manifests/audits | docs/archive/proidu-v3 or legacy/proidu | Preserve history, do not treat as executable |
| proidu-bot | none | Empty source repository |
| ai-platform-core/src/proidu-mai.ts and worker | services/ingestion/adapters/mai | Extract parser and worker contracts; replace Supabase persistence |
| ai-platform-core/src/adapters/proidu.ts | packages/contracts + services/api | Replace system.echo transport proof with real OpenAPI admission API |
| ai-platform-core generic orchestration | separate shared service | Keep outside PROIDU domain until other product dependencies are mapped; migrate Vercel runtime separately |

## Consolidation rules
1. Never overwrite or delete the original repositories during consolidation.
2. Preserve source commit SHA, source path and blob hash for each imported file.
3. Generated dist assets are excluded from the canonical source; rebuild them from source.
4. Remove duplicate package manifests only after a root workspace and lockfile pass CI.
5. Keep a single package manager and a single lockfile at the monorepo root.
6. Keep Supabase integration behind a temporary adapter until the new API is accepted.
7. A legacy folder is archival evidence, not an active deployment target.

## Git strategy
- main remains the current production reference.
- feature branches are created from the new PROIDU 4.0 integration branch.
- PR required for every change.
- protected main, required tests and one successful deployment check.
- release tags identify application version, schema version and ingestion parser version together.