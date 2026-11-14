# PROIDU API

Target: TypeScript modular monolith using Fastify (or NestJS with Fastify adapter), OpenAPI contracts and PostgreSQL 17.

Initial modules:
- identity
- catalogue
- admissions-russia
- admissions-global
- route-engine
- cases
- source-evidence
- admin
- billing (disabled until rebuilt and security-tested)

No browser receives database credentials. All Telegram initData and webhook signatures are verified server-side. See docs/proidu-4.0/09_FILE_LEVEL_FIXES.md.