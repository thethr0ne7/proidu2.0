create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_trgm with schema extensions;

create table if not exists public.regions (
  id text primary key,
  name text not null,
  district text not null,
  monitoring_id text unique,
  published boolean not null default true
);

create table if not exists public.institutions (
  id uuid primary key default gen_random_uuid(),
  monitoring_id text unique,
  official_name text not null,
  short_name text,
  normalized_name text not null default '',
  aliases text[] not null default '{}',
  region_id text references public.regions(id),
  city text,
  address text,
  is_branch boolean not null default false,
  parent_id uuid references public.institutions(id) on delete set null,
  official_site text,
  monitoring_url text,
  ownership text,
  coverage_status text not null default 'catalog_only' check (coverage_status in ('catalog_only','sources_found','partial','verified')),
  published boolean not null default true,
  source_checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sources (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid references public.institutions(id) on delete cascade,
  kind text not null check (kind in ('monitoring','admission_page','rules','program_list','exam_list','seat_plan','tuition','cutoff','competition_list','other')),
  title text not null,
  url text not null,
  admission_year integer,
  status text not null default 'discovered' check (status in ('discovered','fetched','parsed','verified','failed','superseded')),
  checksum text,
  published_at date,
  checked_at timestamptz,
  metadata jsonb not null default '{}',
  unique(url, admission_year)
);

create table if not exists public.programs (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  code text not null,
  title text not null,
  profile_title text,
  level text not null default 'bachelor' check (level in ('bachelor','specialist','basic_higher','master','secondary','other')),
  study_form text not null default 'full_time' check (study_form in ('full_time','part_time','extramural','mixed')),
  profile_group text,
  admission_year integer not null,
  source_id uuid references public.sources(id),
  verification_status text not null default 'partial' check (verification_status in ('discovered','partial','verified','superseded')),
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admission_offers (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  admission_year integer not null,
  budget_places integer,
  paid_places integer,
  target_quota integer,
  special_quota integer,
  separate_quota integer,
  tuition_rub integer,
  source_id uuid references public.sources(id),
  verification_status text not null default 'partial' check (verification_status in ('partial','verified','superseded')),
  published boolean not null default true,
  unique(program_id, admission_year)
);

create table if not exists public.exam_sets (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  admission_year integer not null,
  variant integer not null default 1,
  source_id uuid references public.sources(id),
  verification_status text not null default 'partial' check (verification_status in ('partial','verified','superseded')),
  unique(program_id, admission_year, variant)
);

create table if not exists public.exam_requirements (
  id uuid primary key default gen_random_uuid(),
  exam_set_id uuid not null references public.exam_sets(id) on delete cascade,
  subject text not null,
  min_score integer check (min_score between 0 and 100),
  priority integer not null default 1,
  choice_group integer,
  exam_kind text not null default 'ege' check (exam_kind in ('ege','dvi','internal','creative','professional')),
  unique(exam_set_id, subject, exam_kind)
);

create table if not exists public.cutoff_history (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  year integer not null,
  cutoff_score integer check (cutoff_score between 0 and 500),
  basis text not null default 'budget' check (basis in ('budget','paid','target','special')),
  source_id uuid references public.sources(id),
  verification_status text not null default 'partial' check (verification_status in ('partial','verified','superseded')),
  unique(program_id, year, basis)
);

create table if not exists public.individual_achievement_rules (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  admission_year integer not null,
  achievement_type text not null,
  title text not null,
  points integer not null check (points between 0 and 10),
  conditions jsonb not null default '{}',
  source_id uuid references public.sources(id),
  verification_status text not null default 'partial' check (verification_status in ('partial','verified','superseded'))
);

create table if not exists public.admission_deadlines (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  admission_year integer not null,
  event_type text not null,
  event_at timestamptz not null,
  description text not null,
  source_url text,
  verification_status text not null default 'partial' check (verification_status in ('partial','verified','superseded')),
  unique(institution_id, admission_year, event_type)
);

create table if not exists public.required_documents (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  admission_year integer not null,
  applicant_category text not null default 'general',
  document_code text not null,
  label text not null,
  conditions jsonb not null default '{}',
  source_url text,
  verification_status text not null default 'partial' check (verification_status in ('partial','verified','superseded')),
  unique(institution_id, admission_year, applicant_category, document_code)
);

create table if not exists public.ingestion_runs (
  id uuid primary key default gen_random_uuid(),
  adapter text not null,
  scope text,
  status text not null,
  fetched integer not null default 0,
  inserted integer not null default 0,
  updated integer not null default 0,
  errors jsonb not null default '[]',
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create table if not exists public.source_snapshots (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.sources(id) on delete cascade,
  checksum text not null,
  http_status integer,
  content_type text,
  byte_size bigint,
  etag text,
  last_modified text,
  storage_path text,
  extraction_status text not null default 'pending',
  metadata jsonb not null default '{}',
  fetched_at timestamptz not null default now()
);

create table if not exists public.validation_issues (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid,
  rule_code text not null,
  severity text not null,
  message text not null,
  details jsonb not null default '{}',
  status text not null default 'open',
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists institutions_region_idx on public.institutions(region_id);
create index if not exists institutions_parent_id_idx on public.institutions(parent_id);
create index if not exists institutions_name_trgm_idx on public.institutions using gin (official_name extensions.gin_trgm_ops);
create index if not exists institutions_aliases_idx on public.institutions using gin (aliases);
create index if not exists sources_institution_id_idx on public.sources(institution_id);
create index if not exists programs_institution_id_idx on public.programs(institution_id);
create index if not exists programs_year_idx on public.programs(admission_year);
create index if not exists programs_code_idx on public.programs(code);
create index if not exists programs_source_id_idx on public.programs(source_id);
create index if not exists exam_sets_source_id_idx on public.exam_sets(source_id);
create index if not exists admission_offers_source_id_idx on public.admission_offers(source_id);
create index if not exists cutoff_history_lookup_idx on public.cutoff_history(program_id,basis,year desc);
create index if not exists cutoff_history_source_id_idx on public.cutoff_history(source_id);
create unique index if not exists achievement_rule_unique_idx on public.individual_achievement_rules(institution_id,admission_year,achievement_type,title);
create index if not exists achievements_institution_year_idx on public.individual_achievement_rules(institution_id,admission_year);
create index if not exists admission_deadlines_institution_year_idx on public.admission_deadlines(institution_id,admission_year,event_at);
create index if not exists required_documents_institution_year_idx on public.required_documents(institution_id,admission_year);

alter table public.regions enable row level security;
alter table public.institutions enable row level security;
alter table public.sources enable row level security;
alter table public.programs enable row level security;
alter table public.admission_offers enable row level security;
alter table public.exam_sets enable row level security;
alter table public.exam_requirements enable row level security;
alter table public.cutoff_history enable row level security;
alter table public.individual_achievement_rules enable row level security;
alter table public.admission_deadlines enable row level security;
alter table public.required_documents enable row level security;
alter table public.ingestion_runs enable row level security;
alter table public.source_snapshots enable row level security;
alter table public.validation_issues enable row level security;

revoke all on all tables in schema public from anon, authenticated;
