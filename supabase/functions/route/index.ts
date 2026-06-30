import { createClient } from "npm:@supabase/supabase-js@2.95.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization,x-client-info,apikey,content-type",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
};

const subjectAliases: Record<string, string> = {
  russian: "русский язык", math: "математика", physics: "физика", informatics: "информатика",
  social: "обществознание", biology: "биология", chemistry: "химия", history: "история",
  literature: "литература", foreign: "иностранный язык",
  "русский язык": "русский язык", "математика": "математика", "физика": "физика",
  "информатика": "информатика", "обществознание": "обществознание", "биология": "биология",
  "химия": "химия", "история": "история", "литература": "литература", "иностранный язык": "иностранный язык",
};

function normalizeScores(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const result: Record<string, number> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    const subject = subjectAliases[key.trim().toLocaleLowerCase("ru-RU")] ?? key.trim().toLocaleLowerCase("ru-RU");
    const parsed = Number(raw);
    if (subject && Number.isFinite(parsed)) result[subject] = Math.min(100, Math.max(0, Math.trunc(parsed)));
  }
  return result;
}

function programScore(requirements: any[], scores: Record<string, number>, fallback: number): { eligible: boolean; score: number } {
  if (!Object.keys(scores).length) return { eligible: true, score: fallback };
  const ege = (requirements ?? []).filter((item) => item.exam_kind === "ege");
  if (!ege.length) return { eligible: true, score: fallback };
  let total = 0;
  for (const requirement of ege.filter((item) => item.choice_group == null)) {
    const value = scores[requirement.subject];
    if (!Number.isFinite(value) || (requirement.min_score != null && value < requirement.min_score)) return { eligible: false, score: 0 };
    total += value;
  }
  const groups = new Map<number, any[]>();
  for (const requirement of ege.filter((item) => item.choice_group != null)) {
    const key = Number(requirement.choice_group);
    groups.set(key, [...(groups.get(key) ?? []), requirement]);
  }
  for (const alternatives of groups.values()) {
    const valid = alternatives
      .map((requirement) => ({ requirement, value: scores[requirement.subject] }))
      .filter(({ requirement, value }) => Number.isFinite(value) && (requirement.min_score == null || value >= requirement.min_score))
      .sort((a, b) => b.value - a.value);
    if (!valid.length) return { eligible: false, score: 0 };
    total += valid[0].value;
  }
  return { eligible: true, score: total };
}

function fit(total: number, cutoff: number | null) {
  if (cutoff == null) return { route_score_fit: "no_history", route_score_gap: null };
  const gap = total - cutoff;
  return { route_score_gap: gap, route_score_fit: gap >= 15 ? "safe" : gap >= 0 ? "realistic" : gap >= -20 ? "ambitious" : "below" };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405, headers: cors });

  try {
    const body = await req.json();
    const ids = [...new Set((Array.isArray(body.programIds) ? body.programIds : []).map(String).filter((value: string) => /^[0-9a-f-]{36}$/i.test(value)))].slice(0, 50);
    if (!ids.length) throw new Error("Для маршрута не выбраны программы");
    const year = Math.min(2030, Math.max(2020, Number(body.year) || 2026));
    const fallbackTotal = Math.min(500, Math.max(0, Number(body.totalScore) || 0));
    const scores = normalizeScores(body.scores);
    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false, autoRefreshToken: false } });

    const { data: all, error: programError } = await db.rpc("search_federal_programs", {
      p_query: null, p_subjects: null, p_total_score: null, p_region: null, p_budget_only: true,
      p_year: year, p_score_mode: "all", p_ambitious_gap: 20, p_limit: 500,
    });
    if (programError) throw programError;

    const programs = (all ?? [])
      .filter((item: any) => ids.includes(item.program_id))
      .map((item: any) => ({ item, calculated: programScore(item.exam_requirements ?? [], scores, fallbackTotal) }))
      .filter(({ calculated }: any) => calculated.eligible)
      .map(({ item, calculated }: any) => ({ ...item, user_score: calculated.score }));
    if (!programs.length) throw new Error("Выбранные программы несовместимы с указанными предметами или минимальными баллами");

    const institutions = [...new Set(programs.map((item: any) => item.institution_id))];
    const [rules, deadlines, documents] = await Promise.all([
      db.from("individual_achievement_rules").select("institution_id,achievement_type,title,points,source_id").in("institution_id", institutions).eq("admission_year", year).eq("verification_status", "verified"),
      db.from("admission_deadlines").select("institution_id,event_type,event_at,description,source_url,verification_status").in("institution_id", institutions).eq("admission_year", year).eq("verification_status", "verified").order("event_at"),
      db.from("required_documents").select("institution_id,document_code,label,conditions,source_url,verification_status").in("institution_id", institutions).eq("admission_year", year).eq("applicant_category", "general").eq("verification_status", "verified").order("label"),
    ]);
    if (rules.error) throw rules.error;
    if (deadlines.error) throw deadlines.error;
    if (documents.error) throw documents.error;

    const sourceIds = [...new Set((rules.data ?? []).map((item: any) => item.source_id).filter(Boolean))];
    const sourceMap = new Map<string, string>();
    if (sourceIds.length) {
      const { data, error } = await db.from("sources").select("id,url").in("id", sourceIds);
      if (error) throw error;
      for (const source of data ?? []) sourceMap.set(source.id, source.url);
    }

    const selectedAchievements = new Set<string>();
    if (body.achievements?.honors === true) selectedAchievements.add("honors");
    if (body.achievements?.volunteer === true) selectedAchievements.add("volunteer");
    if (["gold", "silver", "bronze"].includes(body.achievements?.gtoLevel)) selectedAchievements.add(`gto_${body.achievements.gtoLevel}`);

    const group = (rows: any[]) => {
      const map = new Map<string, any[]>();
      for (const row of rows ?? []) map.set(row.institution_id, [...(map.get(row.institution_id) ?? []), row]);
      return map;
    };
    const ruleGroups = group(rules.data ?? []);
    const deadlineGroups = group(deadlines.data ?? []);
    const documentGroups = group(documents.data ?? []);
    const rank: Record<string, number> = { ambitious: 0, realistic: 1, safe: 2, no_history: 3, below: 4 };

    const enriched = programs.map((program: any) => {
      const idBreakdown = (ruleGroups.get(program.institution_id) ?? [])
        .filter((rule: any) => selectedAchievements.has(rule.achievement_type))
        .map((rule: any) => ({ type: rule.achievement_type, title: rule.title, points: rule.points, source_url: rule.source_id ? sourceMap.get(rule.source_id) ?? null : null }));
      const idPoints = Math.min(10, idBreakdown.reduce((sum: number, item: any) => sum + Number(item.points || 0), 0));
      const effectiveScore = Number(program.user_score) + idPoints;
      return {
        ...program,
        id_points: idPoints,
        id_breakdown: idBreakdown,
        effective_score: effectiveScore,
        ...fit(effectiveScore, program.cutoff_score == null ? null : Number(program.cutoff_score)),
        deadlines: deadlineGroups.get(program.institution_id) ?? [],
        documents: documentGroups.get(program.institution_id) ?? [],
      };
    }).sort((a: any, b: any) => (rank[a.route_score_fit] ?? 9) - (rank[b.route_score_fit] ?? 9) || Math.abs(a.route_score_gap ?? 9999) - Math.abs(b.route_score_gap ?? 9999));

    const ordered: any[] = [];
    const usedInstitutions = new Set<string>();
    const usedCities = new Set<string>();
    for (const item of enriched) {
      if (!usedInstitutions.has(item.institution_id) && (!item.city || !usedCities.has(item.city))) {
        ordered.push(item);
        usedInstitutions.add(item.institution_id);
        if (item.city) usedCities.add(item.city);
      }
      if (ordered.length >= 10) break;
    }
    const perInstitution = new Map<string, number>();
    for (const item of ordered) perInstitution.set(item.institution_id, (perInstitution.get(item.institution_id) ?? 0) + 1);
    for (const item of enriched) {
      if (!ordered.includes(item) && (perInstitution.get(item.institution_id) ?? 0) < 2) {
        ordered.push(item);
        perInstitution.set(item.institution_id, (perInstitution.get(item.institution_id) ?? 0) + 1);
      }
      if (ordered.length >= 10) break;
    }

    const items = ordered.map((item: any, index: number) => ({ ...item, priority: index + 1 }));
    const warnings = new Set<string>();
    for (const item of items) {
      const name = item.institution_short_name || item.institution_name;
      if (item.cutoff_score == null) warnings.add(`${name}: исторический проходной балл пока не загружен.`);
      if (!item.deadlines.length) warnings.add(`${name}: дедлайны 2026 пока не загружены.`);
      if (!item.documents.length) warnings.add(`${name}: документы 2026 пока не загружены.`);
      if (selectedAchievements.size && !(ruleGroups.get(item.institution_id) ?? []).length) warnings.add(`${name}: правила ИД 2026 пока не загружены.`);
    }
    const categories: Record<string, number> = {};
    for (const item of items) categories[item.route_score_fit] = (categories[item.route_score_fit] ?? 0) + 1;

    return Response.json({ data: {
      items,
      diversification: {
        institutions: new Set(items.map((item: any) => item.institution_id)).size,
        cities: new Set(items.map((item: any) => item.city).filter(Boolean)).size,
        categories,
      },
      warnings: [...warnings],
      generated_at: new Date().toISOString(),
      disclaimer: "Демо-порядок учитывает программный балл по конкретному набору ЕГЭ, индивидуальные достижения и диверсификацию вузов и городов. Проходной балл прошлой кампании не гарантирует поступление в 2026 году.",
    } }, { headers: { ...cors, "Cache-Control": "no-store" } });
  } catch (error) {
    console.error(error);
    return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 400, headers: { ...cors, "Cache-Control": "no-store" } });
  }
});
