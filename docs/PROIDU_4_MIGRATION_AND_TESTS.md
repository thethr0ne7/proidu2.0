
# PROIDU 4.0 | Безопасная миграция и матрица тестов
Статус: PLAN ONLY. Не выполнять cutover без независимого восстановления бэкапа.

## Карта переноса
| Источник | Приёмник |
|---|---|
| proidu2.0/apps/web | apps/web; заменить все Supabase endpoint fallbacks |
| proidu2.0/supabase/migrations | data/migrations; сделать совместимыми с vanilla PG, сохранить первоначальные SHA |
| proidu2.0/supabase/functions/search | services/api; переписать ограничение и пагинацию |
| proidu2.0/supabase/functions/route | services/api; выборка строго по requested programIds |
| proidu2.0/supabase/functions/telegram-payments | isolated disabled service, затем защищённый платежный контур |
| proidu2.0/scripts/ingest/README.md | services/worker and data/source-adapters |
| proidu2.0/fixtures | data/fixtures (не заполнять production verified без аудита) |
| proidu-bot1.1 SPO концепт | apps/web + packages/admission-rules, без DEMO_SPO |
| proidu документация | docs/history с подтверждением наличия артефактов |
| proidu-bot пустой | пропустить |

## Этапы миграции без потери данных
1. Получить санкционированный read-only аудит Supabase, определить владельца истины: PG, storage, auth, API and pending writes.
2. Зафиксировать SHA коммитов и backup исходной БД, S3/storage объектов и метаданных пользователей. Проверить инвентарь: table counts, PK/FK, views, RLS, triggers, functions, extensions, time zones.
3. Сделать полный консистентный dump/snapshot, зафиксировать хэши/временные метки/WAL позицию. Восстановить на изолированном стенде и сверить counts/checksums. Если restore не проходит — остановиться.
4. Создать Timeweb staging PG с приватной сетью, минимальными правами, шифрованием, тестируемыми PITR/независимым offsite backup.
5. Прогнать базовые миграции на чистом PostgreSQL, выявить incompatibilities (в частности schema extensions); сохранить исходные primary keys и relations.
6. Перенести данные и storage, сверить контрольные суммы по таблицам и выборкам; проверить разницу повторным прогоном.
7. Развернуть shadow-read API на новой базе. Провести совместимые тесты search/route, edge cases, Telegram auth, SPO, международные правила.
8. Выбрать стратегию final delta: управляемая пауза записи + последний перенос ИЛИ проверенная CDC с транзакционным порядком и идемпотентностью. Не включать слепую dual-write.
9. Переключить DNS/API/traffic после security/load/restore test и gate approval. Старую систему оставить read-only на согласованный срок.
10. После переключения любые новые записи в target должны быть согласованы перед rollback. Слепое направление трафика обратно приведёт к потере записей.

## Acceptance / test gates
- Clean PostgreSQL migration and rehearsal rollback.
- Counts/checksums by table and key/foreign-key integrity = reconciliation passed.
- Search >10,000 programs, stable cursor and no hidden 500-row truncation.
- Selected program at rank >500 returns a correct route.
- EGE: mandatory, alternatives, minimum scores, internal exams and absence of sources.
- SPO: grounded per-university mapping and ЕГЭ fallback without fake promises.
- International: citizenship, prior-education country, entry basis, effective date, reviewer.
- Telegram forgery/expired initData denied; unauthorized private records denied; API rate-limit.
- Paid path disabled until payment callback integrity, idempotency, persistence and refunds.
- Data factory: changed document -> immutable snapshot -> reviewer -> publication.
- Browser E2E, accessibility/mobile, observability, backup restore and disaster recovery drill.

## Immediate next work
A) CI smoke/test/build real execution with captured logs. B) Clean PG migration test. C) Fix P0 program-ID bug and unsupported SPO route. D) Supabase data inventory. E) Timeweb target sizing and staging only after verified backup.

**No production updates are authorized or executed in this plan.**
