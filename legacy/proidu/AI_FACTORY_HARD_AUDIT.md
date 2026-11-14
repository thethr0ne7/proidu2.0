# AI Factory 2.0 Hard Audit — ProiduClaude.zip

Дата прогона: 2026-07-07

## Объём проверки

Проверены все файлы архива: 21 zip-entry, 13 реальных файлов, 679 строк/минифицированных строк.

Ключевые файлы:
- `assets/proidu-factory-data-gate.js` — 249 строк
- `assets/proidu-factory-data-gate.css` — 1 минифицированная строка
- `index.html` — 16 строк
- `scripts/build.mjs` — 6 строк
- `scripts/test.mjs` — 26 строк после усиления
- `supabase/analytics_events.sql` — 49 строк
- `.github/workflows/pages.yml` — 30 строк

## Gate result

Команды:

```bash
npm run ship
node --check assets/proidu-factory-data-gate.js
node --check dist/assets/proidu-factory-data-gate.js
```

Результат:

- PASS build
- PASS tests
- PASS JS parser check
- PASS source/dist sync
- PASS no dependency vulnerability surface: external npm dependencies отсутствуют

`npm audit` не применим без lockfile, но зависимостей в `package.json` нет.

## Что уже сделано правильно

1. P0 growth loop внедрён:
   - value proposition на первом экране;
   - summary-карточка результата;
   - share-кнопка;
   - Telegram deep link;
   - fallback при пустой базе;
   - события аналитики.

2. Data Coverage Gate честный:
   - нет обещания гарантированного поступления;
   - пустой результат не скрывается;
   - есть оговорки про открытые данные и проходные прошлых лет.

3. Build готов для GitHub Pages:
   - `dist/index.html` существует;
   - assets синхронизированы;
   - workflow deploy-pages настроен.

## Найденные проблемы и исправления

### FIX-001 — небезопасный source_url

Проблема: `source_url` из данных вставлялся в `href` после HTML escaping, но без проверки протокола. HTML escaping не блокирует `javascript:` URL.

Исправлено:

- добавлена функция `safeUrl(value)`;
- разрешены только `http:` и `https:`;
- добавлен `rel="noopener noreferrer"`.

### FIX-002 — sessionId зависел от прямого `crypto.randomUUID`

Проблема: в некоторых окружениях обращение к `crypto.randomUUID` может быть неустойчивым.

Исправлено:

- заменено на `globalThis.crypto?.randomUUID?.()` с fallback на timestamp/random.

### FIX-003 — тесты были слишком слабыми

Проблема: тесты проверяли только базовое наличие Telegram SDK, Supabase, CSS и Factory-текстов.

Исправлено:

Добавлены gate-проверки:
- P0 value proposition;
- P0 summary card;
- P0 referral handling;
- P0 analytics events;
- source URL sanitization;
- отсутствие небезопасного обещания поступления.

## Острые риски, которые остаются

### RISK-001 — DATA Gate всё ещё главный блокер роста

Текущее покрытие:
- 82 программы в поиске;
- 11 вузов с программами;
- 4 route-ready вуза;
- 10 484 pending ingestion-задачи.

Вывод: маркетинг нельзя масштабировать до расширения базы. Иначе пользователь откроет приложение, введёт баллы и часто получит пустой результат.

### RISK-002 — ref handling только на фронте

Фронт парсит Telegram `start_param`, но бот должен реально передавать этот параметр в Mini App и/или логировать его на своей стороне.

P1-задача:
- добавить обработку `/start ref_*` в боте;
- прокидывать ref/source в Mini App launch params;
- связать `ref_open` с `share_clicked`.

### RISK-003 — аналитика открыта на insert для anon

Это нормально для MVP, но публичный endpoint можно заспамить.

P1/P2 усиление:
- добавить rate limit через Edge Function;
- писать аналитику не напрямую в таблицу, а через Supabase Function;
- добавить валидацию event_name.

### RISK-004 — нет визуального smoke-test в реальном Telegram

В контейнере невозможно проверить настоящий Telegram WebApp share flow и Supabase runtime.

Перед деплоем вручную проверить на телефоне:
- открытие Mini App из бота;
- `t.me/share/url`;
- сохранение analytics_events;
- поведение при пустом результате.

## Итоговый статус

Статус: `SHIP-CANDIDATE / P0 READY`

Можно деплоить на GitHub Pages, но не запускать массовый трафик до выполнения SQL-миграции и проверки Telegram share-flow.

## Следующая команда

```bash
npm run ship
```

Затем выполнить:

```sql
-- supabase/analytics_events.sql
```

в Supabase SQL Editor проекта `hgivyjjethjwswjrvroy`.
