-- Run as database/migration administrator AFTER creating account proidu_app
-- in the managed PostgreSQL panel. Do not use for the migration identity.
-- Security: runtime API is READ ONLY, no table ownership, no DDL.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'proidu_app') THEN
    RAISE EXCEPTION 'Create dedicated proidu_app login in Timeweb DB panel first';
  END IF;
END $$;
GRANT USAGE ON SCHEMA public TO proidu_app;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM proidu_app;
GRANT SELECT ON TABLE
  public.regions, public.institutions, public.sources,
  public.programs, public.admission_offers, public.exam_sets,
  public.exam_requirements, public.cutoff_history,
  public.individual_achievement_rules, public.admission_deadlines,
  public.required_documents, public.spo_specialties,
  public.spo_admission_rules
TO proidu_app;
-- Confirm no inherited broad write privileges through role membership.
-- Do not change actual production roles without inspecting existing grants.
