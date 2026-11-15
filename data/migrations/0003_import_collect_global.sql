-- PROIDU 4.0 | isolated migration, source ingestion, AI Factory bridge and Global.
-- Intentionally does not import shared Supabase GI/AF objects or applicant PII.
CREATE SCHEMA IF NOT EXISTS migration;
CREATE TABLE migration.extract_batches (
    batch_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    source_ref text NOT NULL,
    source_pg_version text,
    source_snapshot timestamptz NOT NULL,
    started_at timestamptz NOT NULL DEFAULT now(),
    finished_at timestamptz,
    status text NOT NULL DEFAULT 'running'
        CHECK (status IN ('running','completed','failed','reconciled')),
    table_counts jsonb NOT NULL DEFAULT '{}'::jsonb,
    table_digests jsonb NOT NULL DEFAULT '{}'::jsonb,
    CHECK (length(source_ref) BETWEEN 1 AND 100)
);
CREATE TABLE migration.source_rows (
    batch_id uuid NOT NULL REFERENCES migration.extract_batches(batch_id) ON DELETE CASCADE,
    source_table text NOT NULL,
    source_pk text NOT NULL,
    payload jsonb NOT NULL,
    payload_sha256 char(64) NOT NULL CHECK (payload_sha256 ~ '^[a-f0-9]{64}$'),
    captured_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (batch_id, source_table, source_pk)
);
CREATE INDEX migration_rows_by_table_idx ON migration.source_rows(batch_id, source_table);
CREATE TABLE migration.reconciliations (
    batch_id uuid NOT NULL REFERENCES migration.extract_batches(batch_id),
    checked_at timestamptz NOT NULL DEFAULT now(),
    table_name text NOT NULL,
    expected_rows bigint NOT NULL,
    observed_rows bigint NOT NULL,
    expected_digest text,
    observed_digest text,
    passed boolean NOT NULL,
    PRIMARY KEY(batch_id,table_name,checked_at)
);
CREATE SCHEMA IF NOT EXISTS collector;
CREATE TABLE collector.sources (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    source_key text NOT NULL UNIQUE,
    track text NOT NULL CHECK (track IN ('russia','global')),
    country_iso2 char(2) NOT NULL,
    admission_year integer NOT NULL CHECK (admission_year BETWEEN 2020 AND 2100),
    institution_id uuid REFERENCES public.institutions(id),
    official_url text NOT NULL,
    parser_key text NOT NULL,
    status text NOT NULL DEFAULT 'candidate'
        CHECK (status IN ('candidate','active','paused','blocked')),
    last_hash text,
    last_checked_at timestamptz,
    published_count integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    CHECK (official_url ~ '^https://'),
    CHECK (country_iso2 ~ '^[A-Z]{2}$')
);
CREATE TABLE collector.jobs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id uuid NOT NULL REFERENCES collector.sources(id),
    idempotency_key text NOT NULL UNIQUE,
    state text NOT NULL DEFAULT 'queued'
        CHECK (state IN ('queued','running','succeeded','failed','quarantine')),
    retry_count integer NOT NULL DEFAULT 0 CHECK (retry_count BETWEEN 0 AND 10),
    locked_at timestamptz,
    next_attempt_at timestamptz NOT NULL DEFAULT now(),
    started_at timestamptz,
    completed_at timestamptz,
    error_code text,
    result_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX collector_jobs_ready_idx ON collector.jobs(state,next_attempt_at);
CREATE TABLE collector.snapshots (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id uuid NOT NULL REFERENCES collector.sources(id),
    content_sha256 text NOT NULL CHECK (content_sha256 ~ '^[0-9a-f]{64}$'),
    url text NOT NULL,
    storage_key text,
    content_bytes integer CHECK (content_bytes BETWEEN 0 AND 5000000),
    fetched_at timestamptz NOT NULL DEFAULT now(),
    http_status integer,
    content_type text,
    UNIQUE(source_id,content_sha256)
);
CREATE TABLE collector.candidates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id uuid NOT NULL REFERENCES collector.sources(id),
    snapshot_id uuid NOT NULL REFERENCES collector.snapshots(id),
    source_record_key text NOT NULL,
    payload jsonb NOT NULL,
    payload_sha256 text NOT NULL CHECK (payload_sha256 ~ '^[0-9a-f]{64}$'),
    validation_state text NOT NULL DEFAULT 'quarantine'
       CHECK (validation_state IN ('quarantine','review','verified')),
    reason text,
    evidence_url text,
    admission_year integer NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(source_id,source_record_key,payload_sha256)
);
CREATE INDEX collector_candidates_state_idx ON collector.candidates(validation_state,admission_year);
CREATE SCHEMA IF NOT EXISTS global_admissions;
CREATE TABLE global_admissions.institutions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    source_key text NOT NULL UNIQUE,
    country_iso2 char(2) NOT NULL CHECK (country_iso2 ~ '^[A-Z]{2}$'),
    institution_name text NOT NULL,
    city text,
    official_url text,
    verification_state text NOT NULL DEFAULT 'candidate'
       CHECK (verification_state IN ('candidate','review','verified')),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE global_admissions.programs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id uuid NOT NULL REFERENCES global_admissions.institutions(id),
    admission_year integer NOT NULL,
    title text NOT NULL,
    teaching_language text,
    degree_level text,
    foreign_applicant_eligibility text NOT NULL DEFAULT 'unknown'
       CHECK (foreign_applicant_eligibility IN ('unknown','allowed','restricted','review')),
    evidence_source_id uuid REFERENCES collector.sources(id),
    evidence_url text,
    verification_state text NOT NULL DEFAULT 'candidate'
       CHECK (verification_state IN ('candidate','review','verified')),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE SCHEMA IF NOT EXISTS ai_factory_bridge;
CREATE TABLE ai_factory_bridge.requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    operation text NOT NULL CHECK (operation IN ('extract_official','validate_evidence')),
    correlation_id text NOT NULL UNIQUE,
    source_id uuid REFERENCES collector.sources(id),
    payload jsonb NOT NULL,
    state text NOT NULL DEFAULT 'pending'
      CHECK (state IN ('pending','leased','completed','failed','rejected')),
    created_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL DEFAULT (now() + interval '15 minutes'),
    CHECK (octet_length(payload::text) <= 32768)
);
CREATE TABLE ai_factory_bridge.responses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id uuid NOT NULL UNIQUE REFERENCES ai_factory_bridge.requests(id),
    status text NOT NULL CHECK (status IN ('completed','failed','rejected')),
    result jsonb NOT NULL,
    evidence_sha256 text,
    received_at timestamptz NOT NULL DEFAULT now(),
    CHECK (octet_length(result::text) <= 131072)
);
-- No anonymous grants; all access is via a future authenticated internal gateway.
