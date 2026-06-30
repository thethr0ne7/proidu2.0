import type { ExamRequirement, FederalProgramResult, ScoreFit } from './federalApi';

const SUBJECT_LABELS: Record<string, string> = {
  'русский язык': 'Русский язык',
  математика: 'Математика',
  физика: 'Физика',
  информатика: 'Информатика',
  обществознание: 'Обществознание',
  биология: 'Биология',
  химия: 'Химия',
  история: 'История',
  литература: 'Литература',
  'иностранный язык': 'Иностранный язык',
};

export const FIT_LABELS: Record<ScoreFit, string> = {
  safe: 'Запасной',
  realistic: 'Реалистичный',
  ambitious: 'Амбициозный',
  below: 'Ниже ориентира',
  no_history: 'Нет истории',
  not_requested: 'Без расчёта',
};

export function subjectLabel(subject: string): string {
  return SUBJECT_LABELS[subject] ?? subject;
}

function requirementLabel(requirement: ExamRequirement): string {
  const base = subjectLabel(requirement.subject);
  return requirement.min_score == null ? base : `${base} от ${requirement.min_score}`;
}

export function formatExamRequirements(requirements: ExamRequirement[]): string {
  if (!requirements?.length) return 'Экзамены уточняются в источнике';

  const mandatory = requirements
    .filter((item) => item.choice_group == null)
    .sort((a, b) => a.priority - b.priority)
    .map(requirementLabel);

  const groups = new Map<number, ExamRequirement[]>();
  requirements
    .filter((item) => item.choice_group != null)
    .forEach((item) => {
      const key = item.choice_group as number;
      groups.set(key, [...(groups.get(key) ?? []), item]);
    });

  const alternatives = [...groups.values()]
    .sort((a, b) => (a[0]?.priority ?? 0) - (b[0]?.priority ?? 0))
    .map((items) => items.sort((a, b) => a.subject.localeCompare(b.subject, 'ru')).map(requirementLabel).join(' / '));

  return [...mandatory, ...alternatives].join(' + ');
}

export function summarizeCoverage(results: FederalProgramResult[]): { universities: number; cities: number; regions: number } {
  return {
    universities: new Set(results.map((item) => item.institution_id)).size,
    cities: new Set(results.map((item) => item.city).filter(Boolean)).size,
    regions: new Set(results.map((item) => item.region_id).filter(Boolean)).size,
  };
}

export function formatGap(gap: number | null | undefined): string {
  if (gap == null) return 'нет ориентира';
  return gap > 0 ? `+${gap}` : String(gap);
}
