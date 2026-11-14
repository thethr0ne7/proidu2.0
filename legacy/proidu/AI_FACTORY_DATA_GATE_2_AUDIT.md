# AI Factory DATA Gate 2.0 Audit — Source Evidence Build

## Статус

`SHIP-CANDIDATE / DATA GATE 2.0 SOURCE READY`

Эта сборка усиливает предыдущий Full Route Build. Теперь завод не только показывает бюджет, контракт и целевое образование, но и фиксирует правило: каждое поле маршрута должно быть извлечено из источника или отмечено как требующее ingestion/manual review.

## Что добавлено

### 1. Source Evidence Gate

Новый gate:

```text
official_source_url
→ raw_document
→ field evidence
→ normalized value
→ verification status
→ route_ready
```

Программа не считается route-ready, пока нет источников по ключевым трекам.

### 2. Data Gate policy

Файл:

```text
src/data-gate-policy.json
```

Содержит обязательные поля для:
- identity;
- exams;
- budget;
- contract;
- target;
- deadlines;
- provenance.

### 3. SQL schema для источников

Файл:

```text
supabase/data_gate_sources.sql
```

Добавлены таблицы:
- `admission_sources`;
- `program_source_evidence`;
- `data_gate_program_status`;
- `ingestion_tasks`.

Добавлены view:
- `data_gate_missing_evidence`;
- `data_gate_track_coverage`.

### 4. Edge Function scaffold

Файл:

```text
supabase/functions/ingest-admission-source/index.ts
```

Назначение:
- принять `source_url`;
- безопасно загрузить источник;
- извлечь candidate evidence по бюджетным, контрактным и целевым данным;
- вернуть evidence rows без выдумывания данных.

### 5. Gate tests

Файл:

```text
scripts/data-gate-check.mjs
```

Проверяет, что:
- политика источников существует;
- бюджет требует `budget_source_url`;
- контракт требует `contract_source_url`;
- целевое требует `target_source_url`;
- SQL содержит source/evidence/gate-таблицы;
- frontend объясняет Source Evidence Gate.

Команда:

```bash
npm run data-gate
```

`npm run ship` теперь запускает:

```text
build → unit/gate tests → DATA Gate 2.0 checks
```

## Что изменено во фронте

- Добавлен `DATA Gate 2.0 / Source Evidence Gate`.
- Добавлен Source Evidence Gate в factory-панель.
- Добавлен Source Priority список.
- Карточки программ теперь явно различают:
  - `Проверено по источнику`;
  - `Источник есть · частично`;
  - `Источник требует ingestion`.
- Footer теперь фиксирует следующий data-pass через источники.

## Что ещё требует реального подключения

1. Выполнить SQL:

```text
supabase/analytics_events.sql
supabase/data_gate_sources.sql
```

2. Задеплоить Edge Function:

```text
supabase/functions/ingest-admission-source/index.ts
```

3. Подключить ingestion worker к списку вузов и источников.

4. Наполнить `ingestion_tasks` официальными ссылками:
- страницы приёмных комиссий;
- PDF/XLSX правил приёма;
- страницы стоимости обучения;
- целевые квоты / предложения заказчиков;
- Госуслуги / суперсервис, где доступно.

## Правило качества

```text
Нет источника → нет подтверждённого поля.
Нет подтверждённого бюджет/контракт/целевого трека → нет route-ready.
```

## Команды проверки

```bash
npm run ship
node --check assets/proidu-factory-data-gate.js
node --check dist/assets/proidu-factory-data-gate.js
npm run data-gate
```

## Итог

Код готов к GitHub Pages-деплою, а DATA Gate получил схему и правила источников. Следующий настоящий шаг — массовое наполнение `ingestion_tasks` официальными источниками и запуск ingestion worker.
