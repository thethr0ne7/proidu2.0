# AI Platform Core

Единое ядро для специализированных AI-продуктов экосистемы.

## Products

- PROIDU — поступление, образовательные и карьерные маршруты.
- Grant AI — гранты, субсидии и меры государственной поддержки.
- AI Factory — производство, аудит и выпуск AI-продуктов.
- Agro AI — сельское хозяйство, земля, производство и агротехнологии.
- Tourism AI — туристические продукты и маршруты.
- Education AI — образовательные сервисы.
- Gov Intelligence — мониторинг программ, документов и государственных сигналов.

## Shared core

1. AI Orchestrator
2. Memory
3. RAG Search
4. Knowledge Base
5. Authentication
6. Billing
7. Analytics
8. UI System

## Architecture rule

Каждый продукт подключается к общему ядру через явные контракты. Продуктовые данные, правила и интерфейсы не должны проникать в ядро напрямую.

## Delivery loop

INPUT → PLAN → PRODUCE → CHECK → FIX → SAVE → SHIP

## Current stage

`v0 — architecture foundation`

Цель текущей ветки: создать проверяемый каркас платформы без изменения рабочей ветки `main`.