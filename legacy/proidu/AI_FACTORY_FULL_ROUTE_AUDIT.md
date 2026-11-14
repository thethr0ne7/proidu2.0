# AI Factory Full Route Audit — Proidu

## Factory status

**Status:** SHIP-CANDIDATE / FULL ROUTE P1 READY

Сборка прошла hard audit после добавления трёх admission tracks:

- Budget Places
- Contract Track
- Target Education Track

## Что было до правок

P0 growth loop уже существовал:

```text
Open Mini App → Enter EGE scores → Result summary → Share to friend → Referral open
```

Но маршрут поступления был неполным: основной акцент был на бюджетных местах. Это ломало реальную семейную логику поступления, потому что абитуриенту нужен не только бюджет, но и резервный контрактный план и целевое обучение.

## Что добавлено

### 1. Budget Places

Карточки и summary теперь явно показывают бюджетные места 2026, если поле есть в данных.

### 2. Contract Track

Добавлены поля и UI-слой:

- `paid_places`
- `contract_places`
- `tuition_available`
- `tuition_price_year`
- `tuition_price_total`
- `payment_options`

Если данных нет, интерфейс не выдумывает цену и показывает `цена требует источника`.

### 3. Target Education Track

Добавлены поля и UI-слой:

- `target_places`
- `target_seats`
- `target_available`
- `target_employer`
- `target_source_url`

Если данных нет, интерфейс показывает, что нужны заказчик, квота и источник.

### 4. Full Route Monetization CTA

Добавлена кнопка:

```text
Собрать бюджет + контракт + целевое
```

Она ведёт в Telegram-бота с параметром `full_route_<track>` и пишет событие `route_interest`.

### 5. Analytics

Добавлено:

- `admission_track` в event payload;
- `admission_track_changed`;
- `route_interest`;
- SQL column/index for `admission_track`.

## Проверки

Команды:

```bash
npm run ship
node --check assets/proidu-factory-data-gate.js
node --check dist/assets/proidu-factory-data-gate.js
```

Gate checks:

- Telegram SDK loaded
- Supabase search function wired
- DATA Coverage Gate present
- Factory core loop present
- P0 value proposition present
- P0 summary card present
- P0 referral handling present
- P0 analytics events present
- Admission tracks present
- Full route CTA present
- Contract fields wired
- Target education fields wired
- Backend search requests all tracks
- Admission analytics wired
- Source URLs sanitized
- No unsafe guarantee promise

## Главный риск

Код готов к маршрутам, но DATA Gate всё ещё неполный:

```text
82 programs in search layer
11 universities with programs
4 route-ready universities
10 484 pending ingestion tasks
```

Если запустить массовый трафик до расширения данных, многие пользователи увидят пустые треки по контракту/целевому. Это не баг интерфейса, а data coverage risk.

## Следующий ingestion-pass

Нужно загрузить и нормализовать:

```text
program_list
exam_list
budget_places
paid_places
tuition_price_year
tuition_price_total
contract_deadlines
target_places
target_customers
target_source_url
required_documents
admission_deadlines
source_url
```

## Итог

Сборка теперь превращает Proidu из простого калькулятора шансов в маршрутный слой:

```text
Scores → Budget → Contract → Target → Full Paid Route
```
