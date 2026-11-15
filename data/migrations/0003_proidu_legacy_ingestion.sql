-- PROIDU 4.0 staging compatibility tables. Applies ONLY to empty target PostgreSQL 17.
-- These structures represent the PROIDU-owned portion of the shared Supabase source.
-- Never copy GI/AF tables, auth secrets or private storage objects into this DB.

CREATE TABLE IF NOT EXISTS public.institution_monitoring_metrics (
 institution_id uuid NOT NULL REFERENCES public.institutions(id),
 monitoring_year integer NOT NULL,
 average_ege_all numeric, average_ege_budget numeric,
 average_ege_budget_no_special numeric, average_ege_paid numeric,
 average_min_ege numeric, students_total integer, students_full_time integer,
 budget_share numeric, paid_share numeric, source_url text NOT NULL,
 source_checked_at timestamptz NOT NULL,
 extraction_status text NOT NULL, raw_metadata jsonb NOT NULL DEFAULT '{}',
 PRIMARY KEY(institution_id,monitoring_year)
);
CREATE TABLE IF NOT EXISTS public.institution_ugs_groups (
 institution_id uuid NOT NULL REFERENCES public.institutions(id),
 monitoring_year integer NOT NULL, ugs_code text NOT NULL, title text NOT NULL,
 student_count numeric, institution_share numeric, region_share numeric,
 source_url text NOT NULL, source_checked_at timestamptz NOT NULL,
 extraction_status text NOT NULL,
 PRIMARY KEY(institution_id,monitoring_year,ugs_code)
);
CREATE TABLE IF NOT EXISTS public.factory_runs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), run_label text,
 mode text, status text, input_summary jsonb, plan_summary jsonb,
 check_summary jsonb, started_at timestamptz, finished_at timestamptz,
 evidence jsonb, output jsonb, input jsonb
);
CREATE TABLE IF NOT EXISTS public.institution_source_registry (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 institution_id uuid REFERENCES public.institutions(id),
 admission_year integer, source_kind text, url text, discovery_method text,
 status text, last_http_status integer, last_error text, checksum text,
 metadata jsonb, discovered_at timestamptz, checked_at timestamptz,
 updated_at timestamptz
);
CREATE TABLE IF NOT EXISTS public.source_registry (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 institution_id uuid REFERENCES public.institutions(id),
 admission_year integer, source_kind text, source_url text,
 discovery_method text, status text, confidence numeric,
 last_error text, checksum text, checked_at timestamptz,
 created_at timestamptz, updated_at timestamptz,
 evidence jsonb, last_checked_at timestamptz
);
CREATE TABLE IF NOT EXISTS public.ingestion_queue (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 institution_id uuid REFERENCES public.institutions(id),
 admission_year integer, source_kind text, source_url text,
 status text, priority integer, attempts integer,
 last_error text, scheduled_at timestamptz, started_at timestamptz,
 finished_at timestamptz, metadata jsonb, updated_at timestamptz
);
CREATE TABLE IF NOT EXISTS public.ingestion_jobs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 run_id uuid REFERENCES public.factory_runs(id),
 institution_id uuid REFERENCES public.institutions(id),
 source_registry_id uuid REFERENCES public.source_registry(id),
 admission_year integer, job_kind text, status text, priority integer,
 attempts integer, last_error text, payload jsonb,
 scheduled_at timestamptz, started_at timestamptz,
 finished_at timestamptz, created_at timestamptz, updated_at timestamptz
);
CREATE TABLE IF NOT EXISTS public.extraction_evidence (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 source_registry_id uuid REFERENCES public.source_registry(id),
 target_table text, target_id uuid, field_name text,
 extracted_value text, evidence_quote text, source_page integer,
 source_locator text, verification_status text,
 created_at timestamptz
);
CREATE TABLE IF NOT EXISTS public.coverage_snapshots (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 run_id uuid REFERENCES public.factory_runs(id),
 admission_year integer NOT NULL,
 institutions_total integer NOT NULL, institutions_catalog integer NOT NULL,
 institutions_searchable integer NOT NULL, institutions_route_ready integer NOT NULL,
 programs_total integer NOT NULL, programs_verified integer NOT NULL,
 exam_sets_verified integer NOT NULL, offers_verified integer NOT NULL,
 cutoffs_verified integer NOT NULL, source_registry_total integer NOT NULL,
 jobs_total integer NOT NULL, jobs_done integer NOT NULL, jobs_failed integer NOT NULL,
 snapshot jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now()
);

-- Historical PROIDU-MAI namespace, not a shared AI Factory namespace.
CREATE TABLE IF NOT EXISTS public.platform_ingestion_jobs (
 id text PRIMARY KEY, idempotency_key text UNIQUE NOT NULL,
 source_id text NOT NULL, product_id text NOT NULL,
 requirement_id text NOT NULL, entity_type text NOT NULL,
 scheduled_for timestamptz NOT NULL, status text NOT NULL,
 attempt integer NOT NULL, max_attempts integer NOT NULL,
 error text, started_at timestamptz, completed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.platform_data_versions (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 namespace text NOT NULL, record_id text NOT NULL,
 subject text NOT NULL, content_hash text NOT NULL,
 content jsonb NOT NULL, evidence jsonb NOT NULL,
 source_url text NOT NULL, source_version integer NOT NULL,
 created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL,
 inserted_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(namespace,record_id,content_hash)
);
CREATE TABLE IF NOT EXISTS public.platform_evidence_records (
 evidence_id text PRIMARY KEY, namespace text NOT NULL,
 record_id text NOT NULL, source_type text NOT NULL,
 source_ref text NOT NULL, quote text, status text NOT NULL,
 captured_at timestamptz NOT NULL, metadata jsonb,
 inserted_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.platform_source_checkpoints (
 source_id text PRIMARY KEY, last_checked_at timestamptz NOT NULL,
 last_successful_at timestamptz, content_hash text,
 last_job_id text, status text NOT NULL,
 metadata jsonb, updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS proidu_queue_pending_idx ON public.ingestion_queue
  (status, priority DESC, scheduled_at);
CREATE INDEX IF NOT EXISTS proidu_jobs_pending_idx ON public.ingestion_jobs
  (status, priority DESC, scheduled_at);
CREATE INDEX IF NOT EXISTS proidu_registry_institution_idx ON public.source_registry
  (institution_id,admission_year);
CREATE INDEX IF NOT EXISTS proidu_platform_versions_idx ON public.platform_data_versions
  (namespace,record_id,inserted_at DESC);
