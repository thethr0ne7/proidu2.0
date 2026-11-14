# 09. File-level change map

This is the change plan. Do not apply all changes to main in one commit. Each group becomes a reviewable PR with tests.

## Frontend

### apps/web/src/lib/federalApi.ts
- Remove direct Supabase Edge Function URL construction.
- Replace with typed API client generated from OpenAPI.
- Centralise API base URL, timeout, retry and error mapping.
- Do not ship service-role keys or privileged credentials to browser bundles.

### apps/web/src/components/FederalSearch.tsx
- Replace direct function calls with API contracts.
- Remove developer-mode payment toggles.
- Display campaign year, source freshness, verification status and missing-data warnings.
- Do not present budget-only results as the entire admissions universe.

### apps/web/src/components/NationalCatalog.tsx
- Replace local static catalogue assumptions with paginated API data.
- Show institution/branch identity and coverage status.
- Add filters for level, form, region and admission basis.

### apps/web/src/lib/programScore.ts
- Extract to packages/rules-engine.
- Preserve current scoring as a versioned algorithm.
- Add golden tests for tie cases, missing scores, alternate exam sets and cutoff interpretation.
- Never silently substitute historical cutoff for minimum entrance score.

### apps/web/src/lib/routePresentation.ts
- Convert to presentation-only formatting.
- Keep eligibility calculations on the server/domain package.
- Add explanation codes and source references.

### apps/web/src/lib/universityCatalog.ts
- Remove hardcoded national catalogue assumptions.
- Use API cache with campaign/year key.
- Preserve a clear stale-data state.

### apps/web/src/lib/telegram.ts
- Treat Telegram initData as untrusted until verified on the server.
- Validate signature, auth_date freshness and replay/idempotency.
- Never accept client-supplied Telegram user ID as proof of identity.

### apps/web/src/lib/analytics.ts
- Remove any analytics event containing passport, contact, exam results or document data.
- Use consent-aware, minimised events and a Russian-hosted analytics option for Russian user records.

### apps/web/vite.config.ts and apps/web/index.html
- Replace Vercel/Supabase assumptions with environment-neutral build config.
- Configure same-origin API paths and CSP.
- Do not put private environment variables into VITE_ variables.

## Backend

### supabase/functions/search/index.ts
Port to services/api/admissions/search. Add schema validation, rate limiting, query limits, structured logs and source freshness.

### supabase/functions/route/index.ts
Port to services/api/admissions/routes. Separate route calculation from presentation. Add explicit support for budget, paid, target and special quotas.

### supabase/functions/search/scoring.ts
Move deterministic scoring into packages/rules-engine and preserve regression fixtures.

### supabase/functions/telegram-payments/index.ts
Do not port as-is. Rebuild payment adapter with provider signature verification, expected product/amount/currency validation, invoice ownership, idempotency, duplicate-event handling and reconciliation. Keep payment disabled until security tests pass.

### supabase/functions/federal-source-bootstrap/index.ts
Replace with an authenticated admin-only ingestion command. No public endpoint may invoke a service-role operation without a strong server-side secret, narrow scope, audit record and rate limit.

### supabase/config.toml
Archive as legacy deployment configuration. New deployment config belongs in infra/ and services/.

## Database and build
- supabase/migrations/202606300001_federal_core.sql and 202606300002_search_rpc.sql remain historical source files. They are not a complete migration baseline for the live 132-migration database.
- apps/web/package.json and package-lock.json: after API migration, establish one root package manager and lockfile. Do not mix npm, pnpm and nested lockfiles.
- proidu/package.json: archive under legacy/proidu. Do not advertise build/test scripts until the referenced scripts exist and pass.
- proidu-bot1.1/scripts/test.mjs: replace static substring assertions with behavioural tests against rendered flows, API contracts and Telegram identity validation.

## New files to create during implementation
- services/api/modules/catalogue
- services/api/modules/admissions-ru
- services/api/modules/admissions-global
- services/api/modules/identity
- services/api/modules/cases
- services/api/modules/billing
- services/ingestion/adapters
- services/verification/rules
- packages/domain
- packages/contracts/openapi
- packages/rules-engine
- db/migrations
- infra/docker
- infra/terraform