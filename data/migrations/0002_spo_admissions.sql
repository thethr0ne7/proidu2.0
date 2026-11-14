-- Source-linked SPO admission eligibility. No assumptions that the same SPO title
-- qualifies at every university. Create only verified mappings.
CREATE TABLE IF NOT EXISTS public.spo_specialties (
    code text PRIMARY KEY,
    title text NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.spo_admission_rules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id uuid NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
    spo_code text NOT NULL REFERENCES public.spo_specialties(code),
    admission_year integer NOT NULL CHECK (admission_year BETWEEN 2020 AND 2100),
    route_type text NOT NULL DEFAULT 'profile_internal'
        CHECK (route_type IN ('profile_internal', 'requires_ege')),
    profile_match boolean NOT NULL DEFAULT false,
    internal_exams jsonb NOT NULL DEFAULT '[]'::jsonb
        CHECK (jsonb_typeof(internal_exams) = 'array'),
    source_id uuid NOT NULL REFERENCES public.sources(id),
    verification_status text NOT NULL DEFAULT 'partial'
        CHECK (verification_status IN ('partial','verified','superseded')),
    effective_from date,
    effective_to date,
    CONSTRAINT spo_rule_effective_dates CHECK (
        effective_to IS NULL OR effective_from IS NULL OR effective_to >= effective_from
    ),
    UNIQUE (program_id, spo_code, admission_year, route_type)
);
CREATE INDEX IF NOT EXISTS spo_rules_code_year_idx
ON public.spo_admission_rules(spo_code, admission_year, verification_status);
