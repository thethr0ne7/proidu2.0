# ПРОЙДУ? — ROUTE ENGINE + SPO BUILD

Factory Data Gate сборка пересобрана в **PROIDU_ROUTE_ENGINE_SPO_BUILD**.

## Что изменилось

- Добавлен отдельный пользовательский режим: **«У меня диплом СПО»**.
- Главный экран больше не только про ЕГЭ: теперь приложение различает:
  - школьник / ЕГЭ маршрут;
  - выпускник СПО / маршрут после колледжа;
  - профильное поступление по внутренним испытаниям;
  - EGE fallback, если профиль СПО не подтверждён.
- Добавлен **SPO Profile Gate**:
  - без `spo_to_bachelor_mapping`, `admission_rules_spo`, `internal_exams` и `source_url` программа не должна получать уверенный статус поступления без ЕГЭ;
  - при неподтверждённом профиле показывается fallback, а не ложная уверенность.
- DATA Coverage Gate сохранён.
- AI Factory 2.0 не расширялась: использованы core loop, 7 контуров, Second Ring и HTTPS Gate только по activation rules.

## Core loop

INPUT → PLAN → PRODUCE → CHECK → FIX → SAVE → SHIP

## Следующий backend-шаг

Добавить в Supabase функцию/ветку:

```json
{
  "action": "spo_routes",
  "year": 2026,
  "spoCode": "09.02.07",
  "spoTitle": "Информационные системы и программирование",
  "region": "Нальчик",
  "query": "IT"
}
```

И таблицы:

- `spo_specialties`
- `spo_to_bachelor_mapping`
- `admission_rules_spo`
- `university_internal_exams`
- `program_exam_modes`
- `required_documents_spo`
- `source_ledger`

## Проверка

```bash
npm run build
npm test
npm run ship
```

## Deploy

Сборка готова для GitHub Pages. HTTPS для Pages включается на стороне GitHub. Для кастомного домена нужен отдельный DNS/cert/renewal gate.
