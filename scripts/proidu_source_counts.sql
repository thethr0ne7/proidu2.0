-- READ ONLY on source and on restored staging, compare exact values.
-- Run on the same consistent snapshot or during controlled write freeze.
SELECT
 (SELECT count(*) FROM public.regions) regions,
 (SELECT count(*) FROM public.institutions) institutions,
 (SELECT count(*) FROM public.programs) programs,
 (SELECT count(*) FROM public.sources) sources,
 (SELECT count(*) FROM public.exam_sets) exam_sets,
 (SELECT count(*) FROM public.exam_requirements) exam_requirements,
 (SELECT count(*) FROM public.admission_offers) admission_offers,
 (SELECT count(*) FROM public.admission_deadlines) admission_deadlines,
 (SELECT count(*) FROM public.required_documents) required_documents,
 (SELECT count(*) FROM public.source_registry) source_registry,
 (SELECT count(*) FROM public.ingestion_queue) ingestion_queue,
 (SELECT count(*) FROM public.ingestion_jobs) ingestion_jobs,
 (SELECT count(*) FROM public.institution_source_registry) institution_source_registry,
 (SELECT count(*) FROM public.coverage_snapshots) coverage_snapshots;
