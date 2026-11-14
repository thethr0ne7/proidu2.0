"""Read SQL. Parameterized filters; never fetch a globally capped list before ID routing."""
PROGRAM_SELECT = """
SELECT
    p.id::text AS program_id, p.code, p.title, p.profile_title, p.level, p.study_form,
    p.admission_year, i.id::text AS institution_id,
    i.official_name AS institution_name, i.short_name AS institution_short_name,
    i.region_id, r.name AS region_name, i.city, es.variant AS exam_variant,
    COALESCE(ex.requirements, '[]'::jsonb) AS exam_requirements,
    COALESCE(ex.subjects, ARRAY[]::text[]) AS subjects,
    COALESCE(ex.min_scores, '{}'::jsonb) AS minimum_scores,
    ao.budget_places, ao.paid_places, h.cutoff_score, h.year AS cutoff_year,
    CASE WHEN p.verification_status = 'verified'
        AND es.verification_status = 'verified'
        AND ao.verification_status = 'verified'
        AND ps.status = 'verified'
        THEN 'verified' ELSE 'partial' END AS verification_status,
    COALESCE(ps.url, i.official_site, i.monitoring_url) AS source_url
FROM public.programs p
JOIN public.institutions i ON i.id = p.institution_id
LEFT JOIN public.regions r ON r.id = i.region_id
JOIN public.exam_sets es ON es.program_id = p.id AND es.admission_year = p.admission_year
LEFT JOIN LATERAL (
    SELECT jsonb_agg(jsonb_build_object(
        'subject', er.subject, 'min_score', er.min_score,
        'priority', er.priority, 'choice_group', er.choice_group,
        'exam_kind', er.exam_kind
    ) ORDER BY er.priority, er.subject) AS requirements,
    array_agg(DISTINCT er.subject) AS subjects,
    jsonb_object_agg(er.subject, er.min_score)
        FILTER (WHERE er.min_score IS NOT NULL) AS min_scores
    FROM public.exam_requirements er WHERE er.exam_set_id = es.id
) ex ON true
LEFT JOIN public.admission_offers ao ON ao.program_id = p.id
    AND ao.admission_year = p.admission_year AND ao.published
LEFT JOIN LATERAL (
    SELECT c.cutoff_score, c.year FROM public.cutoff_history c
    WHERE c.program_id = p.id AND c.basis = 'budget'
        AND c.verification_status = 'verified' AND c.cutoff_score IS NOT NULL
    ORDER BY c.year DESC LIMIT 1
) h ON true
LEFT JOIN public.sources ps ON ps.id = p.source_id
WHERE i.published AND p.published
    AND p.verification_status IN ('partial', 'verified')
    AND es.verification_status IN ('partial', 'verified')
    AND p.admission_year = %s
"""

SEARCH_FILTER = """
 AND (%s = '' OR i.official_name ILIKE %s OR COALESCE(i.short_name, '') ILIKE %s
      OR p.title ILIKE %s OR p.code ILIKE %s)
 AND (%s = '' OR r.name ILIKE %s OR COALESCE(i.city, '') ILIKE %s OR i.region_id ILIKE %s)
 AND (NOT %s OR COALESCE(ao.budget_places, 0) > 0)
 AND (p.id > %s::uuid OR (p.id = %s::uuid AND es.variant > %s))
 ORDER BY p.id ASC, es.variant ASC
"""

SELECT_IDS = """
 AND p.id = ANY(%s::uuid[])
 ORDER BY p.id ASC, es.variant ASC
"""
