# ПРОЙДУ? — AI Factory Supreme Route Build

GitHub Pages-ready сборка Telegram Mini App с полным маршрутом поступления: **бюджетные места, платная основа, целевое образование, сценарии абитуриента, документы, ДВИ, приоритетное зачисление и мониторинг финального этапа**.

## Статус

```text
SHIP-CANDIDATE / DATA Gate 3.0 / Admission Route OS
```

## Что есть в продукте

- Telegram Mini App shell.
- Supabase search function `/functions/v1/search`.
- DATA Coverage Gate.
- DATA Gate 3.0 / Source Evidence Gate.
- Budget / Contract / Target tracks.
- Summary-карточка результата.
- Share-кнопка через `t.me/share/url`.
- Deep link parsing: `ref_`, `share_result`, `group_`, `city_`, `route_`.
- Growth analytics: `app_open`, `referral_open`, `form_started`, `search_clicked`, `result_shown`, `empty_result`, `share_clicked`, `route_interest`.
- GitHub Pages workflow.

## Последние улучшения

### 1. Gosuslugi Route Layer

Статьи для абитуриентов превращены в функциональную карту маршрута, а не в контент для копирования:

```text
Кто ты
→ что сдаёшь
→ куда хочешь
→ какой трек
→ какие документы
→ как подать
→ как не пропустить зачисление
```

### 2. Applicant Scenario Gate

Добавлены сценарии:

- после 11 класса;
- после колледжа / СПО;
- без ЕГЭ / внутренние испытания;
- олимпиада / БВИ;
- льгота / квота;
- целевое;
- контракт.

### 3. Exam Match + Individual Achievements

Добавлены:

- предметы ЕГЭ;
- сумма баллов;
- индивидуальные достижения;
- подсказка, что доп. баллы могут перевести программу между риск-зонами.

### 4. Route Builder

Теперь результат показывает:

- бюджетные места;
- платную основу;
- стоимость контракта в год;
- целевое обучение;
- заказчика / работодателя, если есть;
- ДВИ / дополнительные испытания;
- общежитие;
- этап маршрута;
- источник и статус evidence.

### 5. Risk Zones

- зелёная зона — запас по баллам;
- жёлтая зона — реалистичный / пограничный вариант;
- красная зона — амбициозный вариант;
- серая логика — данных мало / нужен source check.

### 6. Documents Checklist

Добавлен базовый чек-лист документов:

- паспорт;
- СНИЛС;
- аттестат / диплом СПО;
- результаты ЕГЭ или внутренние испытания;
- индивидуальные достижения;
- документы на льготы / квоты;
- документы для целевого;
- медицинская справка, если нужна.

### 7. Paid Route CTA

Монетизационная кнопка:

```text
Собрать бюджет + контракт + целевое
```

Она ведёт к заявке на полный маршрут с человеком.

## DATA Gate правило

```text
Нет источника → нет подтверждённого поля.
Нет источника по треку → трек требует ingestion.
Нет источников по бюджету / контракту / целевому → программа не route-ready.
```

Gosuslugi Route Layer может давать этапы и пользовательские сценарии, но **числа** — бюджетные места, стоимость, целевые места, сроки — требуют официального Source Evidence.

## Запуск и проверка

```bash
npm install
npm run ship
node --check assets/proidu-factory-data-gate.js
node --check dist/assets/proidu-factory-data-gate.js
```

## Проверки в `npm run ship`

- build;
- JS parser check;
- Telegram SDK gate;
- Supabase search gate;
- Source Evidence Gate;
- Budget / Contract / Target gate;
- Gosuslugi Route Layer gate;
- Applicant Scenario Gate;
- Documents Checklist gate;
- Additional Test Gate;
- Priority Admission Gate;
- Enrollment Monitor stage.

## Supabase порядок применения

1. Выполнить `supabase/analytics_events.sql`.
2. Выполнить `supabase/data_gate_sources.sql`.
3. Задеплоить `supabase/functions/ingest-admission-source/index.ts`.
4. Наполнить `ingestion_tasks` официальными ссылками вузов и источников целевого / контрактного / бюджетного приёма.

## Деплой на GitHub Pages

1. Залить содержимое архива в репозиторий.
2. Включить GitHub Pages для ветки `main`.
3. Workflow `.github/workflows/pages.yml` соберёт и опубликует `dist`.
4. В Telegram проверить открытие Mini App из `@proidu2026_bot`.

## Продуктовая формула

```text
БАЛЛЫ
→ ДОП. ДОСТИЖЕНИЯ
→ СЦЕНАРИЙ АБИТУРИЕНТА
→ БЮДЖЕТНЫЙ РИСК
→ КОНТРАКТНЫЙ РЕЗЕРВ
→ ЦЕЛЕВОЙ ШАНС
→ ДОКУМЕНТЫ / ДВИ / ПРИОРИТЕТНОЕ
→ ПОЛНЫЙ МАРШРУТ
→ ЗАЯВКА НА СОПРОВОЖДЕНИЕ
```
