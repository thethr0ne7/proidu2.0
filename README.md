# ПРОЙДУ? — Federal Admissions Navigator v0.3.0

Telegram Mini App / GitHub Pages frontend connected to a live Supabase DATA CORE.

## What works

- Search by individual ЕГЭ scores, not only by a shared total.
- Mandatory subjects, per-subject minimums and alternative exam groups are checked separately.
- Search by university, program title, code, region and city.
- Modes: route candidates, reachable by historical cutoff, all compatible programs.
- Multi-university and multi-city results.
- Developer full route: university-specific individual achievements, diversified priorities, deadlines and document checklists.
- Honest coverage labels and source links.
- National institution catalog.

## Current live data coverage

- 89 regions.
- 751 institutions and branches in the catalog.
- 9 verified 2026 programs in the competitive search layer.
- Current verified multi-city route test: HSE, MIPT, KFU and ITMO.

The code is ready for federal-scale ingestion, but the current database does **not** yet contain admission documents for every Russian university. The UI does not claim otherwise.

## Local run

```bash
cd apps/web
npm ci
npm test
npm run dev
```

## Production build

```bash
cd apps/web
npm ci
npm test
npm run build
```

## GitHub Pages

1. Push the repository contents to `main`.
2. Open `Settings → Pages`.
3. Select `GitHub Actions` as the source.
4. The workflow builds `apps/web` and deploys `apps/web/dist`.

## Supabase functions

```text
supabase/functions/search
supabase/functions/route
supabase/functions/telegram-payments
```

`search` and `route` are live. Payments are intentionally disabled in the production frontend until Telegram Stars webhook and support flows are configured.

## Data safety

- `service_role` is never shipped to the browser.
- Public tables are protected by RLS and revoked direct access.
- The browser only calls server-side Edge Functions.
- A program is shown as verified only when it has traceable official sources.

See `docs/FINAL_STATUS.md` and `docs/DEPLOY.md`.
