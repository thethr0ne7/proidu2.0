create or replace function public.search_federal_institutions(p_query text default null,p_region text default null,p_limit int default 100)
returns table(institution_id uuid,official_name text,short_name text,region_id text,region_name text,district text,city text,is_branch boolean,official_site text,monitoring_url text,coverage_status text,source_checked_at timestamptz)
language sql stable security invoker set search_path=public as $$
select i.id,i.official_name,i.short_name,i.region_id,r.name,r.district,i.city,i.is_branch,i.official_site,i.monitoring_url,i.coverage_status,i.source_checked_at
from public.institutions i left join public.regions r on r.id=i.region_id
where i.published
and (p_query is null or btrim(p_query)='' or i.official_name ilike '%'||btrim(p_query)||'%' or coalesce(i.short_name,'') ilike '%'||btrim(p_query)||'%' or coalesce(i.city,'') ilike '%'||btrim(p_query)||'%' or exists(select 1 from unnest(i.aliases) a where a ilike '%'||btrim(p_query)||'%'))
and (p_region is null or btrim(p_region)='' or coalesce(r.name,'') ilike '%'||btrim(p_region)||'%' or coalesce(i.region_id,'') ilike '%'||btrim(p_region)||'%')
order by case when lower(coalesce(i.short_name,''))=lower(btrim(coalesce(p_query,''))) then 0 when lower(i.official_name)=lower(btrim(coalesce(p_query,''))) then 0 else 1 end,i.official_name
limit greatest(1,least(coalesce(p_limit,100),500));
$$;

create or replace function public.search_federal_programs(p_query text default null,p_subjects text[] default null,p_total_score int default null,p_region text default null,p_budget_only boolean default true,p_year int default 2026,p_score_mode text default 'route',p_ambitious_gap int default 20,p_limit int default 100)
returns table(institution_id uuid,institution_name text,institution_short_name text,region_id text,region_name text,city text,program_id uuid,code text,title text,profile_title text,level text,study_form text,admission_year int,subjects text[],exam_requirements jsonb,minimum_scores jsonb,budget_places int,paid_places int,cutoff_score int,cutoff_year int,score_gap int,score_fit text,verification_status text,source_url text)
language sql stable security invoker set search_path=public as $$
with candidate as(
select i.id institution_id,i.official_name institution_name,i.short_name institution_short_name,i.region_id,r.name region_name,i.city,p.id program_id,p.code,p.title,p.profile_title,p.level,p.study_form,p.admission_year,
array_agg(er.subject order by er.priority,er.choice_group nulls first,er.subject) subjects,
jsonb_agg(jsonb_build_object('subject',er.subject,'min_score',er.min_score,'priority',er.priority,'choice_group',er.choice_group,'exam_kind',er.exam_kind) order by er.priority,er.choice_group nulls first,er.subject) exam_requirements,
coalesce(jsonb_object_agg(er.subject,er.min_score) filter(where er.min_score is not null),'{}'::jsonb) minimum_scores,
ao.budget_places,ao.paid_places,ch.cutoff_score,ch.year cutoff_year,
case when p_total_score is null or ch.cutoff_score is null then null else p_total_score-ch.cutoff_score end score_gap,
case when p_total_score is null then 'not_requested' when ch.cutoff_score is null then 'no_history' when p_total_score>=ch.cutoff_score+15 then 'safe' when p_total_score>=ch.cutoff_score then 'realistic' when p_total_score>=ch.cutoff_score-greatest(0,coalesce(p_ambitious_gap,20)) then 'ambitious' else 'below' end score_fit,
case when p.verification_status='verified' and es.verification_status='verified' and coalesce(ao.verification_status,'verified')='verified' and coalesce(ch.verification_status,'verified')='verified' then 'verified' else 'partial' end verification_status,
coalesce(chs.url,aos.url,ess.url,ps.url,i.official_site,i.monitoring_url) source_url
from public.programs p join public.institutions i on i.id=p.institution_id left join public.regions r on r.id=i.region_id join public.exam_sets es on es.program_id=p.id and es.admission_year=p_year join public.exam_requirements er on er.exam_set_id=es.id left join public.admission_offers ao on ao.program_id=p.id and ao.admission_year=p_year and ao.published left join public.sources aos on aos.id=ao.source_id left join public.sources ess on ess.id=es.source_id left join public.sources ps on ps.id=p.source_id left join lateral(select c.cutoff_score,c.year,c.verification_status,c.source_id from public.cutoff_history c where c.program_id=p.id and c.basis='budget' and c.cutoff_score is not null order by c.year desc limit 1)ch on true left join public.sources chs on chs.id=ch.source_id
where i.published and p.published and p.admission_year=p_year and p.verification_status in('partial','verified') and es.verification_status in('partial','verified') and(not p_budget_only or coalesce(ao.budget_places,0)>0)
and(p_query is null or btrim(p_query)='' or i.official_name ilike '%'||btrim(p_query)||'%' or coalesce(i.short_name,'') ilike '%'||btrim(p_query)||'%' or p.title ilike '%'||btrim(p_query)||'%' or coalesce(p.profile_title,'') ilike '%'||btrim(p_query)||'%' or p.code ilike '%'||btrim(p_query)||'%')
and(p_region is null or btrim(p_region)='' or coalesce(r.name,'') ilike '%'||btrim(p_region)||'%' or coalesce(i.region_id,'') ilike '%'||btrim(p_region)||'%')
and(p_subjects is null or cardinality(p_subjects)=0 or(not exists(select 1 from public.exam_requirements req where req.exam_set_id=es.id and req.choice_group is null and not(req.subject=any(p_subjects))) and not exists(select req.choice_group from public.exam_requirements req where req.exam_set_id=es.id and req.choice_group is not null group by req.choice_group having not bool_or(req.subject=any(p_subjects)))))
group by i.id,i.official_name,i.short_name,i.region_id,r.name,i.city,p.id,p.code,p.title,p.profile_title,p.level,p.study_form,p.admission_year,es.id,ao.budget_places,ao.paid_places,ch.cutoff_score,ch.year,p.verification_status,es.verification_status,ao.verification_status,ch.verification_status,chs.url,aos.url,ess.url,ps.url,i.official_site,i.monitoring_url)
select c.* from candidate c where p_total_score is null or p_score_mode='all' or(p_score_mode='reachable' and c.cutoff_score is not null and c.score_gap>=0)or(p_score_mode='route' and(c.cutoff_score is null or c.score_gap>=-greatest(0,coalesce(p_ambitious_gap,20))))
order by case c.score_fit when 'safe' then 0 when 'realistic' then 1 when 'ambitious' then 2 when 'no_history' then 3 else 4 end,abs(coalesce(c.score_gap,9999)),c.institution_name,c.code,c.title limit greatest(1,least(coalesce(p_limit,100),500));
$$;

create or replace function public.federal_data_coverage()
returns table(regions_count bigint,institutions_count bigint,programs_count bigint,verified_programs_count bigint,offers_2026_count bigint,cutoff_2025_count bigint,updated_at timestamptz)
language sql stable security invoker set search_path=public as $$
select(select count(*) from public.regions where published),(select count(*) from public.institutions where published),(select count(*) from public.programs where published),(select count(*) from public.programs where published and verification_status='verified'),(select count(*) from public.admission_offers where published and admission_year=2026),(select count(*) from public.cutoff_history where year=2025 and verification_status='verified'),greatest(coalesce((select max(updated_at) from public.institutions),'-infinity'::timestamptz),coalesce((select max(updated_at) from public.programs),'-infinity'::timestamptz));
$$;

revoke all on function public.search_federal_institutions(text,text,int) from public,anon,authenticated;
revoke all on function public.search_federal_programs(text,text[],int,text,boolean,int,text,int,int) from public,anon,authenticated;
revoke all on function public.federal_data_coverage() from public,anon,authenticated;
grant execute on function public.search_federal_institutions(text,text,int) to service_role;
grant execute on function public.search_federal_programs(text,text[],int,text,boolean,int,text,int,int) to service_role;
grant execute on function public.federal_data_coverage() to service_role;
