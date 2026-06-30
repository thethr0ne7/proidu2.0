export const SUBJECT_ALIASES: Record<string, string> = {
  russian: 'русский язык', 'русский': 'русский язык', 'русский язык': 'русский язык',
  math: 'математика', mathematics: 'математика', 'математика': 'математика',
  physics: 'физика', 'физика': 'физика',
  informatics: 'информатика', computer_science: 'информатика', 'информатика': 'информатика',
  social: 'обществознание', social_studies: 'обществознание', 'обществознание': 'обществознание',
  biology: 'биология', 'биология': 'биология', chemistry: 'химия', 'химия': 'химия',
  history: 'история', 'история': 'история', literature: 'литература', 'литература': 'литература',
  foreign: 'иностранный язык', foreign_language: 'иностранный язык', 'иностранный язык': 'иностранный язык',
};

export function normalizeScores(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const result: Record<string, number> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    const normalized = key.trim().toLocaleLowerCase('ru-RU');
    const subject = SUBJECT_ALIASES[normalized] ?? normalized;
    const score = Number(raw);
    if (subject && Number.isFinite(score)) result[subject] = Math.min(100, Math.max(0, Math.trunc(score)));
  }
  return result;
}

export function normalizeSubjects(value: unknown): string[] | null {
  const raw = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : [];
  const result = [...new Set(raw.map((item) => {
    const normalized = String(item).trim().toLocaleLowerCase('ru-RU');
    return SUBJECT_ALIASES[normalized] ?? normalized;
  }).filter(Boolean))];
  return result.length ? result : null;
}

export function calculateProgramScore(requirements: any[], scores: Record<string, number>) {
  const ege = (requirements ?? []).filter((item) => item.exam_kind === 'ege');
  if (!ege.length) return { eligible: true, score: null as number | null };
  let total = 0;

  for (const requirement of ege.filter((item) => item.choice_group == null)) {
    const score = scores[requirement.subject];
    if (!Number.isFinite(score)) return { eligible: false, score: null };
    if (requirement.min_score != null && score < requirement.min_score) return { eligible: false, score: null };
    total += score;
  }

  const groups = new Map<number, any[]>();
  for (const requirement of ege.filter((item) => item.choice_group != null)) {
    const group = Number(requirement.choice_group);
    groups.set(group, [...(groups.get(group) ?? []), requirement]);
  }
  for (const alternatives of groups.values()) {
    const valid = alternatives
      .map((requirement) => ({ requirement, score: scores[requirement.subject] }))
      .filter(({ requirement, score }) => Number.isFinite(score) && (requirement.min_score == null || score >= requirement.min_score))
      .sort((a, b) => b.score - a.score);
    if (!valid.length) return { eligible: false, score: null };
    total += valid[0].score;
  }
  return { eligible: true, score: total };
}

export function classifyScore(score: number | null, cutoff: number | null, ambitiousGap: number) {
  if (score == null) return { score_fit: 'not_requested', score_gap: null };
  if (cutoff == null) return { score_fit: 'no_history', score_gap: null };
  const gap = score - cutoff;
  return {
    score_gap: gap,
    score_fit: gap >= 15 ? 'safe' : gap >= 0 ? 'realistic' : gap >= -ambitiousGap ? 'ambitious' : 'below',
  };
}
