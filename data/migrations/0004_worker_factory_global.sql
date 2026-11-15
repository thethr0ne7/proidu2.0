-- PROIDU 4.0 isolated ingestion / Global applicant foundation.
-- No automatic publishing: evidence must be reviewed and versioned.
CREATE TABLE IF NOT EXISTS public.proidu_worker_jobs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 job_key text UNIQUE NOT NULL,
 product text NOT NULL CHECK (product IN ('proidu','proidu_global')),
 source_url text NOT NULL,
 source_id text NOT NULL,
 admission_year integer NOT NULL CHECK (admission_year BETWEEN 2020 AND 2100),
 status text NOT NULL DEFAULT 'pending'
  CHECK (status IN ('pending','running','succeeded','failed','quarantined','dead_letter')),
 attempts integer NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 20),
 max_attempts integer NOT NULL DEFAULT 3 CHECK (max_attempts BETWEEN 1 AND 20),
 lease_until timestamptz,
 error_code text,
 result_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.proidu_source_candidates (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 job_id uuid NOT NULL REFERENCES public.proidu_worker_jobs(id),
 source_id text NOT NULL, source_url text NOT NULL,
 admission_year integer NOT NULL,
 entity_type text NOT NULL, entity_key text NOT NULL,
 content jsonb NOT NULL CHECK (jsonb_typeof(content) = 'object'),
 content_sha256 char(64) NOT NULL,
 evidence jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(evidence) = 'array'),
 review_status text NOT NULL DEFAULT 'quarantined'
  CHECK (review_status IN ('quarantined','pending_review','verified','rejected')),
 quarantine_reason text,
 inserted_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(source_id,entity_type,entity_key,content_sha256)
);
CREATE INDEX IF NOT EXISTS proidu_candidates_review_idx
 ON public.proidu_source_candidates(review_status,inserted_at DESC);
CREATE INDEX IF NOT EXISTS proidu_worker_due_idx
 ON public.proidu_worker_jobs(status,lease_until,created_at);

-- Controlled cross-project exchange. Default state does NOT imply approval.
CREATE TABLE IF NOT EXISTS public.proidu_factory_inbox (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 event_id uuid NOT NULL UNIQUE,
 producer text NOT NULL,
 schema_version integer NOT NULL CHECK (schema_version = 1),
 event_type text NOT NULL CHECK (event_type IN
  ('source.research.proposed','source.evidence.proposed','quality.review.requested')),
 target text NOT NULL CHECK (target IN ('proidu','proidu_global')),
 payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
 payload_sha256 char(64) NOT NULL,
 state text NOT NULL DEFAULT 'pending_review'
  CHECK (state IN ('pending_review','accepted','rejected')),
 received_at timestamptz NOT NULL DEFAULT now(),
 reviewed_at timestamptz
);
CREATE INDEX IF NOT EXISTS proidu_factory_inbox_state_idx
 ON public.proidu_factory_inbox(state,received_at);
CREATE TABLE IF NOT EXISTS public.proidu_factory_outbox (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 event_id uuid NOT NULL UNIQUE,
 schema_version integer NOT NULL DEFAULT 1 CHECK (schema_version = 1),
 event_type text NOT NULL CHECK (event_type IN
  ('source.check.requested','candidate.review.requested','coverage.report.generated')),
 target text NOT NULL CHECK (target='ai_factory'),
 payload jsonb NOT NULL CHECK (jsonb_typeof(payload)='object'),
 delivery_status text NOT NULL DEFAULT 'pending'
  CHECK (delivery_status IN ('pending','sent','acknowledged','failed')),
 created_at timestamptz NOT NULL DEFAULT now(),
 delivered_at timestamptz
);

-- International recruitment track. No generalization of one country's law.
CREATE TABLE IF NOT EXISTS public.global_source_registry (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 country_code char(2) NOT NULL CHECK (country_code ~ '^[A-Z]{2}$'),
 official_url text NOT NULL,
 title text NOT NULL,
 issuer text NOT NULL,
 language_code text NOT NULL,
 status text NOT NULL DEFAULT 'discovered'
  CHECK (status IN ('discovered','reviewing','verified','superseded','rejected')),
 effective_from date, effective_to date,
 checked_at timestamptz, content_sha256 char(64),
 UNIQUE(country_code, official_url),
 CHECK (effective_to IS NULL OR effective_from IS NULL OR effective_to>=effective_from)
);
CREATE TABLE IF NOT EXISTS public.global_institutions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 country_code char(2) NOT NULL CHECK (country_code ~ '^[A-Z]{2}$'),
 official_name text NOT NULL, original_name text,
 city text, institution_type text, official_url text NOT NULL,
 source_id uuid NOT NULL REFERENCES public.global_source_registry(id),
 status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','verified','retired')),
 UNIQUE(country_code,official_url)
);
CREATE TABLE IF NOT EXISTS public.global_programs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 institution_id uuid NOT NULL REFERENCES public.global_institutions(id),
 source_id uuid NOT NULL REFERENCES public.global_source_registry(id),
 external_code text, official_title text NOT NULL,
 language_code text, education_level text NOT NULL,
 admission_year integer NOT NULL CHECK (admission_year BETWEEN 2020 AND 2100),
 tuition_amount numeric, tuition_currency char(3),
 status text NOT NULL DEFAULT 'draft'
  CHECK (status IN ('draft','verified','withdrawn')),
 source_checked_at timestamptz,
 UNIQUE(institution_id,admission_year,external_code,official_title)
);
CREATE TABLE IF NOT EXISTS public.global_admission_rules (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 program_id uuid NOT NULL REFERENCES public.global_programs(id),
 source_id uuid NOT NULL REFERENCES public.global_source_registry(id),
 applicant_country_code char(2),
 applicant_category text NOT NULL,
 rule_kind text NOT NULL CHECK (rule_kind IN
  ('academic','language','document','visa','scholarship','deadline','fee')),
 rule_data jsonb NOT NULL CHECK (jsonb_typeof(rule_data)='object'),
 valid_from date, valid_until date,
 verification_status text NOT NULL DEFAULT 'draft'
  CHECK (verification_status IN ('draft','verified','superseded','rejected')),
 CHECK (valid_until IS NULL OR valid_from IS NULL OR valid_until>=valid_from)
);
CREATE INDEX IF NOT EXISTS global_programs_country_idx
 ON public.global_institutions(country_code,status);
CREATE INDEX IF NOT EXISTS global_programs_year_idx
 ON public.global_programs(admission_year,status);
CREATE INDEX IF NOT EXISTS global_rules_applicant_idx
 ON public.global_admission_rules(applicant_country_code,applicant_category,rule_kind);
