import { createClient } from 'npm:@supabase/supabase-js@2.95.0';
import { calculateProgramScore, classifyScore, normalizeScores, normalizeSubjects } from './scoring.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization,x-client-info,apikey,content-type',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
};
const integer = (value: unknown, fallback: number, min: number, max: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, Math.trunc(parsed))) : fallback;
};
const optionalInteger = (value: unknown, min: number, max: number) => value == null || value === '' ? null : integer(value, 0, min, max);
const text = (value: unknown) => String(value ?? '').trim().slice(0, 200) || null;

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (!['GET', 'POST'].includes(request.method)) return Response.json({ error: 'Method not allowed' }, { status: 405, headers: cors });

  try {
    const url = new URL(request.url);
    const payload = request.method === 'POST' ? await request.json().catch(() => ({})) : Object.fromEntries(url.searchParams.entries());
    const action = String(payload.action ?? 'programs');
    const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });

    if (action === 'coverage') {
      const { data, error } = await db.rpc('federal_data_coverage');
      if (error) throw error;
      return Response.json({ data: data?.[0] ?? null }, { headers: { ...cors, 'Cache-Control': 'public,max-age=120' } });
    }
    if (action === 'institutions') {
      const { data, error } = await db.rpc('search_federal_institutions', {
        p_query: text(payload.query ?? payload.q), p_region: text(payload.region), p_limit: integer(payload.limit, 100, 1, 500),
      });
      if (error) throw error;
      return Response.json({ data: data ?? [], meta: { count: data?.length ?? 0 } }, { headers: cors });
    }
    if (action !== 'programs') return Response.json({ error: 'Unknown action' }, { status: 400, headers: cors });

    const scores = normalizeScores(payload.scores);
    const scoreSubjects = Object.keys(scores);
    const subjects = scoreSubjects.length ? scoreSubjects : normalizeSubjects(payload.subjects);
    const fallbackTotal = optionalInteger(payload.totalScore ?? payload.total_score, 0, 500);
    const mode = ['route', 'reachable', 'all'].includes(String(payload.scoreMode)) ? String(payload.scoreMode) : 'route';
    const ambitiousGap = integer(payload.ambitiousGap, 20, 0, 100);
    const year = integer(payload.year, 2026, 2020, 2030);

    const { data, error } = await db.rpc('search_federal_programs', {
      p_query: text(payload.query ?? payload.q), p_subjects: subjects, p_total_score: null,
      p_region: text(payload.region), p_budget_only: payload.budgetOnly !== false && payload.budgetOnly !== 'false',
      p_year: year, p_score_mode: 'all', p_ambitious_gap: ambitiousGap, p_limit: integer(payload.limit, 200, 1, 500),
    });
    if (error) throw error;

    const matchesMode = (program: any) => {
      if (mode === 'all') return true;
      if (mode === 'reachable') return program.score_gap != null && program.score_gap >= 0;
      return ['no_history', 'safe', 'realistic', 'ambitious'].includes(program.score_fit);
    };
    const rank: Record<string, number> = { safe: 0, realistic: 1, ambitious: 2, no_history: 3, below: 4, not_requested: 5 };
    const result = (data ?? []).map((program: any) => {
      const calculated = scoreSubjects.length ? calculateProgramScore(program.exam_requirements ?? [], scores) : { eligible: true, score: fallbackTotal };
      if (!calculated.eligible) return null;
      return { ...program, user_score: calculated.score, ...classifyScore(calculated.score, program.cutoff_score == null ? null : Number(program.cutoff_score), ambitiousGap) };
    }).filter(Boolean).filter(matchesMode).sort((a: any, b: any) =>
      (rank[a.score_fit] ?? 9) - (rank[b.score_fit] ?? 9)
      || Math.abs(a.score_gap ?? 9999) - Math.abs(b.score_gap ?? 9999)
      || String(a.institution_name).localeCompare(String(b.institution_name), 'ru'));

    return Response.json({ data: result, meta: { count: result.length, year, scoreMode: mode, scoreInput: scoreSubjects.length ? 'per_subject' : 'total_only' } }, { headers: { ...cors, 'Cache-Control': 'public,max-age=20' } });
  } catch (error) {
    console.error(error);
    return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 400, headers: { ...cors, 'Cache-Control': 'no-store' } });
  }
});
