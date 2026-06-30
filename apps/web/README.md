# ПРОЙДУ? web client

React + Vite Telegram Mini App connected to the live Supabase Federal DATA CORE.

## User flow

```text
ЕГЭ subjects and individual scores
→ compatibility and minimum-score validation
→ programs from different universities and cities
→ university-specific achievement calculation
→ diversified route, deadlines and documents
```

## Environment

Production public endpoints are stored in `.env.production`. The browser never receives the Supabase service-role key.

Payments are disabled by default:

```env
VITE_PAYMENTS_ENABLED=false
```

## Commands

```bash
npm ci
npm test
npm run dev
npm run build
```
