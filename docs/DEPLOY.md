# Deployment

## Existing simple GitHub Pages repository

Use the separate Pages ZIP. Replace only:

```text
index.html
assets/
```

Delete old hashed files from `assets/` before uploading the new ones.

## Clean source repository

Upload the contents of the full GitHub ZIP, then configure:

```text
Settings → Pages → Source → GitHub Actions
```

The workflow runs:

```text
npm ci
npm test
npm run build
```

## Environment

`apps/web/.env.production` already contains public URLs for the live Supabase project. The publishable key is safe for the frontend; the `service_role` key must never be added.

Payments remain disabled:

```env
VITE_PAYMENTS_ENABLED=false
```

Enable them only after the Telegram Stars webhook, pre-checkout confirmation, successful-payment persistence, support and refund paths are operating.
