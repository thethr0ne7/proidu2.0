# 04. Infrastructure replacement decision

## Primary candidate: Timeweb Cloud
The current target is Timeweb Cloud because its published service catalogue includes Managed PostgreSQL 17/18, Russian regions, cloud servers, S3-compatible object storage, Valkey, RabbitMQ, CDN, API/CLI/Terraform and a managed application platform. The existing database is PostgreSQL 17.6, so target PostgreSQL 17 first to avoid mixing a cloud migration with a major database upgrade.

Proposed deployment:
- Managed PostgreSQL 17 in a Russian region (Moscow or Saint Petersburg).
- Two Linux cloud servers initially: API/web runtime and ingestion/verification workers. A smaller staging server can be separate.
- Private networking between runtime, workers and database. No public PostgreSQL port.
- RabbitMQ for durable ingestion jobs, retry and dead-letter queues.
- Valkey for cache, short-lived locks and rate limiting. It is not the source of truth.
- S3 private buckets for source snapshots, PDF files and applicant uploads.
- Nginx or Caddy for TLS termination and reverse proxy.
- Docker images for API, workers and admin/web.
- Prometheus/Grafana and structured application logs.
- Encrypted independent database backups to a second S3 provider in Russia.

Timeweb's published PostgreSQL extension list includes pg_trgm, pgcrypto, pgvector and PostGIS. The live database also uses unaccent, uuid-ossp, pg_cron, pg_net and supabase_vault. Confirm extension availability with support before provisioning. Replace Supabase-specific features in code rather than assuming they will exist on the new database.

Provider marketing claims about 152-FZ or SLA do not by themselves make PROIDU compliant. Before purchase, confirm the exact region of the managed database and S3 bucket, data-processing agreement, subprocessors, access controls, backup locations, SLA wording and the security level required by the operator's data-processing model.

## Alternatives

### Yandex Cloud — preferred managed scale-up alternative
Managed PostgreSQL supports PostgreSQL 17/18 and PITR. The platform also offers Object Storage, Serverless Containers, API Gateway, Message Queue, Lockbox, monitoring and container registry. It is a strong option if managed operations and cloud-native scaling outweigh extra platform complexity and cost.

For the first migration, use a VM/container runtime with a private connection to Managed PostgreSQL. Do not put the database on a public IP. Serverless Containers are suitable for stateless workers and bursty APIs, but test cold starts, concurrency, database connection pooling and cost before moving the core API there.

### Selectel — infrastructure and backup candidate
Selectel offers cloud servers, S3, managed Kubernetes, Redis and managed PostgreSQL. The currently published managed PostgreSQL page lists versions 12–16, so it is not the first choice for a direct PostgreSQL 17.6 migration. Selectel can still be used for independent S3 backups or compute; re-evaluate its managed database versions before procurement.

### Cloud.ru — not first choice for this deployment
Cloud.ru has managed PostgreSQL, Redis, Object Storage, Container Apps, Kubernetes, API Gateway and security products. Its Container Apps documentation states that Container Apps does not support connecting to Managed PostgreSQL. A VM or Kubernetes-based topology may work, but it adds avoidable integration work for this first migration.

## Vercel replacement
Do not deploy the Russian applicant product on a foreign serverless frontend platform. Build the frontend as static assets and serve it from the same Russian origin or a domestic CDN after connectivity tests. Run API and workers as Docker containers. Keep the application portable so the same image can be moved between Timeweb, Yandex Cloud, Selectel or a private server.

## Cloudflare
Do not place Cloudflare in the critical path for Russian users. Cloudflare published a September 2026 notice describing ISP-level throttling of traffic to Cloudflare-protected sites in Russia. Test any future CDN from multiple Russian networks before enabling it.

## Vendor-neutral interfaces
- Database: PostgreSQL 17; no Supabase SDK or service-role client.
- File storage: S3 API, private buckets and signed URLs.
- Queue: AMQP/RabbitMQ abstraction.
- Secrets: environment injection from provider secret manager or Vault.
- Deploy: OCI/Docker images.
- API: OpenAPI.
- Infra: Terraform where provider support is mature; otherwise versioned provider API scripts.

## Supabase replacement map

| Supabase capability | Replacement |
|---|---|
| Postgres | Managed PostgreSQL 17 |
| Edge Functions | Fastify/NestJS API and workers |
| Auth | OIDC/Keycloak plus server-verified Telegram identity |
| Storage | S3-compatible object storage |
| Realtime | SSE/WebSocket only where required |
| RLS | DB roles, explicit grants, tenant-scoped policies and API authorization |
| pg_cron | worker scheduler |
| pg_net | application HTTP clients |
| Vault | provider secret manager or Vault |
| generated REST API | explicit OpenAPI endpoints |

## Initial sizing
Do not buy Kubernetes or a large cluster before load testing. Start with a managed PostgreSQL cluster and two modest VMs. Size the database from measured query load, ingestion concurrency and connection counts. Use PgBouncer or provider connection pooling where supported. Scale workers horizontally; keep the API stateless.

## Procurement gate
Before selecting the account and paying:
1. Verify the required managed PostgreSQL 17 extensions.
2. Verify private network connectivity between VM, DB, RabbitMQ and S3.
3. Verify the actual Russian data location for DB, backups and object storage.
4. Obtain written SLA and data-processing terms.
5. Run a restore test and a 24-hour connectivity test from Russia.
6. Compare a full monthly bill including storage, backup, outbound traffic, IPs and support.