# Architecture v0

## Layers

### 1. Product Layer
Содержит пользовательские сценарии, интерфейсы, продуктовые правила и предметные данные отдельных приложений.

### 2. Capability Layer
Повторно используемые возможности: поиск, память, RAG, аналитика, платежи, авторизация и уведомления.

### 3. Orchestration Layer
Маршрутизирует задачи, вызывает инструменты и модели, управляет состоянием процессов и применяет quality gates.

### 4. Data Layer
Источники, ingestion, нормализация, provenance, векторный поиск, граф связей и временные версии.

### 5. Platform Layer
Конфигурация, наблюдаемость, безопасность, CI/CD, Vercel deployment и Supabase integrations.

## Product contract

Каждый продукт обязан определить:

- `product_id`;
- целевого пользователя;
- ключевую задачу;
- разрешённые capabilities;
- собственную схему данных;
- источники данных;
- evidence policy;
- monetization policy;
- quality gates;
- deploy target.

## Core boundary

Общее ядро не должно знать о конкретных вузах, грантах, культурах, туристических объектах или ведомствах. Оно работает только с контрактами, задачами, событиями, документами и результатами.

## First vertical slice

`PROIDU request → orchestrator → admissions capability → evidence-backed result → analytics event → UI response`

## Deployment direction

- Frontend: Vercel.
- Data/Auth/Storage: Supabase.
- Source control and CI: GitHub.
- Telegram surface: Telegram Mini Apps.

## Next build targets

1. TypeScript contracts.
2. Capability registry.
3. Product registry loader.
4. Orchestrator interface.
5. Health endpoint.
6. Architecture validation tests.