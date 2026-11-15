
# PROIDU 4.0 | Инженерный аудит исходного кода
Дата: 2026-11-14. Метод: статический просмотр подключённого GitHub. **Тесты, деплой и актуальная Supabase-БД не проверялись.** Не считать заявления из прошлых README доказательством нынешней работоспособности.

## Карта четырёх репозиториев
- thethr0ne7/proidu2.0: 62 элемента Git-дерева, Vite/React/TypeScript, Edge Functions, PostgreSQL SQL, фикстуры и тесты. Предлагаемый базовый репозиторий.
- thethr0ne7/proidu: 10 файлов, документация/манифесты и минимальная оболочка. Манифесты ссылаются на файлы, отсутствующие в текущем дереве.
- thethr0ne7/proidu-bot: пустой Git-репозиторий (ответ дерева 409).
- thethr0ne7/proidu-bot1.1: 16 элементов, статический frontend и концепт SPO route, демонстрационные данные.

## Findings
| ID | Приоритет | Файл | Подтверждённый риск | Действие |
|---|---|---|---|---|
| F01 | P0 федеральный масштаб | supabase/functions/route/index.ts:74-85 | Выбирает максимум 500 программ, а потом отфильтровывает programIds; подходящие программы за пределом выборки теряются | SQL-запрос по конкретным ID, тест на 501-ю программу |
| F02 | P0 функция СПО | proidu-bot1.1/assets/proidu-factory-data-gate.js:60-63; supabase/functions/search/index.ts:26-38 | UI вызывает spo_routes, но сервер принимает только coverage/institutions/programs | Реализовать проверенную SPO-ветку либо выключить до готовности |
| F03 | P1 безопасность | supabase/config.toml; supabase/functions/search/index.ts:4-24 | Открытый endpoint с verify_jwt=false и привилегированным service_role; не видны rate limit и отдельные права чтения | Least privilege, quotas, аутентификация закрытых API |
| F04 | P1 платежи | supabase/functions/telegram-payments/index.ts | Нет проверяемой аутентификации webhook, idempotency и подтверждённой записи оплаты; frontend выключил платежи | Не включать до внедрения защищённого журнала транзакций |
| F05 | P1 данные | apps/web/src/lib/universityCatalog.ts | Клиент зависит от сторонних proxy r.jina.ai, allorigins, codetabs и страниц мониторинга за 2025 год | Перенести сбор на сервер, официальные источники, версии/снимки |
| F06 | P1 сбор | scripts/ingest/README.md | Есть спецификация загрузчика, но нет действующих адаптеров в просмотренном дереве | Worker, schedule, fetch, extraction, validation, review, publish |
| F07 | P1 релизы | дерево proidu2.0 vs README.md | В main нет .github/workflows, несмотря на описание Pages workflow | Добавить CI/CD, закреплённые зависимости и staging |
| F08 | P1 БД | supabase/migrations/202606300001_federal_core.sql | Extensions устанавливаются в schema extensions, не гарантированную в vanilla PostgreSQL | Тест миграции на чистой PostgreSQL |
| F09 | P1 поиск | supabase/functions/search/index.ts:48-70 | Ограничение 500 происходит до score eligibility / итоговой сортировки, нет стабильной cursor-пагинации | Масштабируемый SQL-поиск и cursor |
| F10 | P1 кампании | apps/web/src/lib/federalApi.ts, apps/web/src/App.tsx | Год 2026 и Supabase URL зафиксированы в исходниках | Campaign/year API и нейтральный endpoint |
| F11 | P1 auth | apps/web/src/lib/telegram.ts | Telegram SDK инициализируется, но серверная проверка Telegram initData и RBAC в просмотренных компонентах отсутствует | HMAC/freshness verification, сессии, роли |
| F12 | P1 происхождение данных | supabase/migrations/* | Есть источники, но недостаточно полноценной истории отдельных фактов и рецензирования | Snapshot/hash/fact-level evidence/review |
| F13 | P2 проверка | apps/web/src/lib/*.test.ts; proidu-bot1.1/scripts/test.mjs | Unit tests есть, bot tests главным образом ищут строки; нет доказанных DR/load/security/API integration tests | Ввести matrix-gates в CI |
| F14 | P2 давность | docs/DATA_COVERAGE.md; docs/FINAL_STATUS.md | 89 регионов, 751 организация/филиал, 9 программ: старый документальный срез 2026-06-30, не живая верификация | Read-only audit реальной БД и количественные контракты |
| F15 | P2 расходящиеся правила | supabase/functions/search/scoring.ts; supabase/functions/route/index.ts | Дублирование нормализации экзаменов и рейтинга | Единый модуль правил и контрактные тесты |

## Сохранить при переносе
Frontend FederalSearch/NationalCatalog, programScore и unit tests (после ревизии), исходные SQL-миграции как baseline, механизм обработки альтернативных ЕГЭ, организационные ID и источники. Демо фикстуры нельзя выдавать за актуальные подтверждённые данные.

## Контракт покрытия
Раздельно считать: организации, филиалы, программы, текущие условия приёма, экзамены, бюджет/контракт, маршруты с проверенными документами. СПО и иностранные заявители получают отдельные версионированные правила, а не косметические переключатели.

**Без доступа к эксплуатационной базе нельзя гарантировать существующие данные, резервные копии, работоспособность endpoints или полноту каталога.**
