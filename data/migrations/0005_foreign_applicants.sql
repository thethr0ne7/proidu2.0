-- Global track means FOREIGN APPLICANTS applying to RUSSIAN institutions.
-- Kept separate from the Russian ЕГЭ journey and any foreign-university catalogue.
-- Sources/rules are country- and year-scoped; no undocumented legal claims.
CREATE TABLE global_admissions.official_rule_sources (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    issuing_body text NOT NULL,
    applicant_country_iso2 char(2),
    rule_kind text NOT NULL CHECK (rule_kind IN (
        'eligibility','quota','paid','language','visa','documents','deadline','recognition','other')),
    official_url text NOT NULL CHECK (official_url ~ '^https://'),
    admission_year integer NOT NULL CHECK (admission_year BETWEEN 2020 AND 2100),
    published_at date,
    effective_from date,
    effective_to date,
    content_sha256 text,
    verification_state text NOT NULL DEFAULT 'candidate'
      CHECK (verification_state IN ('candidate','review','verified','superseded')),
    checked_at timestamptz,
    CHECK (effective_to IS NULL OR effective_from IS NULL OR effective_to>=effective_from)
);
CREATE TABLE global_admissions.foreign_applicant_rules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id uuid REFERENCES public.institutions(id),
    program_id uuid REFERENCES public.programs(id),
    source_id uuid NOT NULL REFERENCES global_admissions.official_rule_sources(id),
    applicant_country_iso2 char(2),
    applicant_education_category text,
    admission_year integer NOT NULL CHECK (admission_year BETWEEN 2020 AND 2100),
    path text NOT NULL CHECK (path IN ('paid','quota','other','unknown')),
    conditions jsonb NOT NULL DEFAULT '{}'::jsonb
      CHECK (jsonb_typeof(conditions) = 'object'),
    verification_state text NOT NULL DEFAULT 'candidate'
      CHECK (verification_state IN ('candidate','review','verified','superseded')),
    checked_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX foreign_applicants_lookup_idx ON global_admissions.foreign_applicant_rules
(admission_year,applicant_country_iso2,verification_state);
-- NO raw personal documents, applicant IDs, visa numbers or passports in this layer.
