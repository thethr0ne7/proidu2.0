# Timeweb PostgreSQL 17 cutover gate

- Source is PostgreSQL 17.6. Timeweb Cloud DBaaS supports PostgreSQL 17. Select 17 for the staging target.
- Source project is shared. Exporting every public table into PROIDU is prohibited until project separation and privacy are reviewed.
- Supabase Free has no managed daily backup included. A source-wide external logical backup plus independently tested restore is mandatory, separately from scoped domain data export.
- Timeweb physical backups should be enabled in the cluster and independently tested. Timeweb logical backup option was described as beta in official documentation and must not be the only protection.
- Public GitHub repository: never commit `.dump`, `.sql.gz`, credential files, logs with connection strings or applicant data.
- For PROIDU only, the scope allowlist lives in `docs/PROIDU_4_SOURCE_EXTRACTION.md`. Transfer of queues is not safe until related schemas, foreign keys, views/triggers, external workers and functions have been reconstructed on target.
- Real server provisioning remains blocked pending authenticated access to Timeweb Cloud project 3186247 and acceptance of resource pricing.
