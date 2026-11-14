-- PROIDU 4.0 / live Supabase inventory
-- READ ONLY. Run in Supabase SQL Editor or with a read-only PostgreSQL role.
-- Does not change schema, rows, grants, functions, storage or migrations.
-- Export the returned JSON together with a separate pg_dump custom-format backup.

with table_inventory as (
  select c.oid, n.nspname as schema_name, c.relname as table_name,
         c.relrowsecurity as rls_enabled,
         c.relforcerowsecurity as force_rls
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('r','p')
),
key_counts as (
  select jsonb_build_object(
    'regions', (select count(*) from public.regions),
    'institutions', (select count(*) from public.institutions),
    'programs', (select count(*) from public.programs),
    'admission_offers', (select count(*) from public.admission_offers),
    'exam_sets', (select count(*) from public.exam_sets),
    'exam_requirements', (select count(*) from public.exam_requirements),
    'cutoff_history', (select count(*) from public.cutoff_history),
    'admission_deadlines', (select count(*) from public.admission_deadlines),
    'required_documents', (select count(*) from public.required_documents),
    'individual_achievement_rules', (select count(*) from public.individual_achievement_rules),
    'sources', (select count(*) from public.sources),
    'source_registry', (select count(*) from public.source_registry),
    'source_snapshots', (select count(*) from public.source_snapshots),
    'ingestion_jobs', (select count(*) from public.ingestion_jobs),
    'ingestion_queue', (select count(*) from public.ingestion_queue),
    'coverage_snapshots', (select count(*) from public.coverage_snapshots),
    'university_check_requests', (select count(*) from public.university_check_requests),
    'payment_intents', (select count(*) from public.payment_intents)
  ) as data
),
auth_counts as (
  select jsonb_build_object(
    'users', (select count(*) from auth.users),
    'identities', (select count(*) from auth.identities),
    'sessions', (select count(*) from auth.sessions)
  ) as data
),
result as (
  select jsonb_build_object(
    'captured_at', now(),
    'database', jsonb_build_object(
      'server_version', version(),
      'database_name', current_database(),
      'public_base_tables', (select count(*) from table_inventory),
      'supabase_migrations', (select count(*) from supabase_migrations.schema_migrations)
    ),
    'extensions', (
      select coalesce(jsonb_agg(jsonb_build_object('name', e.extname, 'version', e.extversion) order by e.extname), '[]'::jsonb)
      from pg_extension e
    ),
    'tables', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'schema', t.schema_name,
        'name', t.table_name,
        'rls_enabled', t.rls_enabled,
        'force_rls', t.force_rls
      ) order by t.table_name), '[]'::jsonb)
      from table_inventory t
    ),
    'columns', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'table', c.table_name,
        'ordinal', c.ordinal_position,
        'name', c.column_name,
        'type', c.data_type,
        'udt', c.udt_name,
        'nullable', c.is_nullable,
        'default', c.column_default
      ) order by c.table_name, c.ordinal_position), '[]'::jsonb)
      from information_schema.columns c
      where c.table_schema = 'public'
    ),
    'constraints', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'table', t.relname,
        'name', con.conname,
        'type', con.contype,
        'definition', pg_get_constraintdef(con.oid, true)
      ) order by t.relname, con.conname), '[]'::jsonb)
      from pg_constraint con
      join pg_class t on t.oid = con.conrelid
      join pg_namespace n on n.oid = t.relnamespace
      where n.nspname = 'public'
    ),
    'indexes', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'table', tablename,
        'name', indexname,
        'definition', indexdef
      ) order by tablename, indexname), '[]'::jsonb)
      from pg_indexes
      where schemaname = 'public'
    ),
    'policies', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'table', tablename,
        'name', policyname,
        'roles', roles,
        'command', cmd,
        'using', qual,
        'with_check', with_check
      ) order by tablename, policyname), '[]'::jsonb)
      from pg_policies
      where schemaname = 'public'
    ),
    'functions', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'name', p.proname,
        'arguments', pg_get_function_identity_arguments(p.oid),
        'result', pg_get_function_result(p.oid),
        'security_definer', p.prosecdef,
        'anon_execute', has_function_privilege('anon', p.oid, 'execute'),
        'authenticated_execute', has_function_privilege('authenticated', p.oid, 'execute')
      ) order by p.proname), '[]'::jsonb)
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
    ),
    'auth_counts', (select data from auth_counts),
    'storage_buckets', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', id,
        'name', name,
        'public', public,
        'file_size_limit', file_size_limit,
        'allowed_mime_types', allowed_mime_types
      ) order by name), '[]'::jsonb)
      from storage.buckets
    ),
    'proidu_data_counts', (select data from key_counts)
  ) as inventory
)
select jsonb_pretty(inventory) as proidu_live_inventory
from result;