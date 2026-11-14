# 02. Hard audit — observed current state

Audit date: 2026-11-14. Evidence was collected from connected GitHub repositories and the live Supabase project. This is a code/configuration and database inspection, not a penetration test or independently certified build.

## Repository inventory
- proidu: 10 tracked files. Package version 3.0.0 references scripts/build.mjs, scripts/test.mjs and scripts/data-gate-check.mjs, which are absent from that repository. Its README/manifests overstate what is executable.
- proidu2.0: 45 tracked files. Contains the React/Vite application, two SQL migrations, three test files, Supabase functions and docs. No GitHub Actions workflow directory was present in the inspected tree.
- proidu-bot1.1: 11 tracked files, including generated dist output. It is a static application with one large JavaScript bundle and string-presence tests. Its README describes a GitHub Pages workflow, but the inspected tree contains no .github/workflows files.
- proidu-bot: empty repository.
- ai-platform-core: 281 tracked files, including the Next.js web app, shared AI Factory/Government Intelligence runtime, 58 Supabase migration SQL files and a PROIDU-MAI ingestion prototype.
- Live deployed Supabase functions are not byte-identical to GitHub source.

## Vercel and AI Platform Core
- The connected Vercel team has one project, ai-platform-core, linked to thethr0ne7/ai-platform-core; no Vercel project is linked directly to proidu2.0.
- Vercel project root is apps/web, framework Next.js, with SSO protection and only vercel.app domains in the inspected project metadata. Latest production deployment is READY; project metadata reports live=false.
- ai-platform-core contains a PROIDU adapter, MAI parser and Supabase worker, but the adapter routes to system.echo rather than the real admissions engine.
- The MAI parser is hard-coded to one official MAI source and admission year 2026. The worker documentation describes a GitHub Actions schedule, but the repository has no .github/workflows directory.
- The MAI worker expects claim_ingestion_job, data_versions, evidence_records and source_checkpoints. These are absent in the inspected live DB; platform_* equivalents exist instead. The 0001_proidu_ingestion migration is not in the live migration ledger.

## Live database facts
- PostgreSQL 17.6.
- 133 base tables in public.
- 132 recorded migrations.
- Shared Supabase project includes PROIDU plus AI Factory and Government Intelligence.
- Supabase Auth: 0 users, 0 identities, 0 sessions.
- PROIDU university_check_requests: 0.
- payment_intents: 0.
- source_snapshots: 0.
- One storage bucket exists: gi-project-documents. It belongs to another workflow and must not be copied into PROIDU by accident.
- Separate Government Intelligence data includes 1,445 source documents, 14 project documents and 37 official-source records. These are outside the PROIDU migration allowlist.

## Coverage reality
Only 11 of 751 catalogued institutions had verified programs in the inspected query, approximately 1.46% of the institution inventory. Current verified program and offer records are for 2026. No 2027 program/offering rows were found. Eight historical cutoffs are not a national historical dataset.

## Critical deployed-function findings
- search: deployed version 7, verify_jwt=false; deployed source length differs from GitHub by one byte.
- route: deployed version 7, verify_jwt=false; deployed source is materially shorter than GitHub source (7,572 vs 10,799 characters).
- telegram-payments: deployed version 5, verify_jwt=false; deployed source is materially longer than GitHub source (4,032 vs 1,569 characters).
- federal-source-bootstrap: verify_jwt=false and uses a service-role credential. The handler needs an explicit constant-time secret check and narrow scope before it can remain exposed.
- telegram-payments: inspected handler does not verify the Telegram webhook secret, accepts payment success without validating expected amount/currency/provider charge and automatically approves pre-checkout. UI currently disables the payment action and payment_intents is empty. Treat this function as unsafe and do not enable it.
- Other shared-project functions also have verify_jwt=false. They require an inventory and per-function threat review; do not assume every function is PROIDU-owned.

## Database access
Core catalogue tables have RLS enabled and no direct anon/authenticated SELECT grant in the inspected privilege query. This is a good baseline. payment_intents has an RLS policy for service_role only. Preserve the principle that clients never receive a database service credential.

## Extensions observed
hypopg, index_advisor, pg_cron, pg_net, pg_stat_statements, pg_trgm, pgcrypto, plpgsql, supabase_vault, unaccent and uuid-ossp.

Supabase-specific facilities must be removed from application dependencies:
- supabase_vault -> provider secret manager or Vault;
- pg_net -> application worker/API client;
- pg_cron -> worker scheduler;
- HypoPG/index_advisor -> development/DBA tooling only;
- uuid-ossp -> native gen_random_uuid where possible;
- unaccent -> verify target-provider support or replace with tested normalisation.

## Audit verdict
Current product: working prototype with a live backend and useful route/search logic. Not production-ready for national coverage, foreign admissions or payment collection.

P0 blockers:
1. Reconcile deployed code with GitHub and close public privileged-function gaps.
2. Stop using payment handler until signature, amount, currency, ownership and idempotency are validated.
3. Extract PROIDU from the shared AI Factory/GI database boundary.
4. Establish a real source-of-truth migration baseline from the live schema.
5. Build the 2027 source/data pipeline and federal coverage controls.

P1 blockers:
- SPO data model and rules engine absent.
- International applicant domain absent.
- Target/paid/foreign route logic incomplete.
- Tests are not behavioural enough.
- No reproducible deployment pipeline or recovery exercise is evidenced.