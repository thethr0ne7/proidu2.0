# PROIDU 4.0 | Timeweb Cloud staging preparation

**Prepared, not provisioned.** No Timeweb service, PostgreSQL cluster or production credentials were created by this commit.

## Proposed setup
1. Within Timeweb Cloud project 3186247, create a private VPC and select a Russian region. Confirm VPC support for both VPS and managed PostgreSQL.
2. Create a managed PostgreSQL 16 cluster, disable public database IP, enable physical backups and configure user permissions. Use a dedicated runtime account; execute migrations as a separate privileged migrator account.
3. Create a test VPS (proposed baseline 2 vCPU / 4 GB / 50-60 GB, Ubuntu LTS) in the same VPC with SSH keys, firewall and Docker Engine/Compose. The actual size depends on performance tests.
4. Check TLS requirements from your cluster's generated connection instructions. Prefer verify-full with a trusted CA/hostname; require encryption in production.
5. Point a real test subdomain's DNS A record to the VPS. Caddy will terminate HTTPS. Database stays private; NEVER expose TCP 5432 to the public Internet.
6. Copy .env.timeweb.example to .env.timeweb ONLY on the server, insert real secrets, set file permissions 600. Never put passwords in GitHub, chats or screenshots.
7. Back up the source if migration involves data. Verify backup restoration and integrity before executing any production migration.
8. On the intended target PostgreSQL with the migrator DSN, run: python -m services.api.migrate (with DATABASE_URL set to migrator DSN). Migrations are for an EMPTY target; do not apply blindly to populated Supabase.
9. From repository root run: docker compose --env-file .env.timeweb -f infra/timeweb/compose.yml up -d --build. Test HTTPS and backend readiness, verify EGE routing beyond 500 and SPO fail-closed conditions.
10. Add metrics, alerts, least-privilege grants, scheduled encrypted offsite backup, verified restore drills and operator approval before sending public traffic.

## Environments
- GitHub Actions: disposable PostgreSQL 16 service with non-production test data.
- Local dev: optional compose.dev-postgres.yml, exposed only on 127.0.0.1:5433.
- Timeweb: externally managed PostgreSQL; compose contains ONLY web, api and gateway.

## Data preservation
Supabase remains untouched until audited. Export consistent PostgreSQL backup, Storage objects and identities, restore to a disposable instance, reconcile counts and keys, then plan final write freeze/change capture and cutover. After switching writes, rollback requires reconciliation; blindly switching backwards can lose data.
Timeweb's logical backup feature is documented as beta/manual, so it is NOT a sole backup strategy.

References:
- https://timeweb.cloud/docs/dbaas/dbaas-create
- https://timeweb.cloud/docs/dbaas/dbaas-manage/logical-backups
- https://timeweb.cloud/docs/cloud-servers/manage-servers/create-server
