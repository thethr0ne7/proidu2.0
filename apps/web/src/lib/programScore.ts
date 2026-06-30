import type { ExamRequirement, ScoreFit } from './federalApi';

export interface ProgramScoreResult {
  eligible: boolean;
  score: number | null;
  missingSubjects: string[];
  belowMinimumSubjects: string[];
}

export function calculateProgramScore(
  requirements: ExamRequirement[],
  scores: Record<string, number>,
): ProgramScoreResult {
  const ege = (requirements ?? []).filter((item) => item.exam_kind === 'ege');
  if (!ege.length) {
    return { eligible: true, score: null, missingSubjects: [], belowMinimumSubjects: [] };
  }

  const missingSubjects: string[] = [];
  const belowMinimumSubjects: string[] = [];
  let total = 0;

  const mandatory = ege.filter((item) => item.choice_group == null);
  for (const requirement of mandatory) {
    const value = scores[requirement.subject];
    if (!Number.isFinite(value)) {
      missingSubjects.push(requirement.subject);
      continue;
    }
    if (requirement.min_score != null && value < requirement.min_score) {
      belowMinimumSubjects.push(requirement.subject);
    }
    total += value;
  }

  const groups = new Map<number, ExamRequirement[]>();
  for (const requirement of ege.filter((item) => item.choice_group != null)) {
    const key = requirement.choice_group as number;
    groups.set(key, [...(groups.get(key) ?? []), requirement]);
  }

  for (const alternatives of groups.values()) {
    const available = alternatives
      .map((requirement) => ({ requirement, value: scores[requirement.subject] }))
      .filter((item) => Number.isFinite(item.value))
      .sort((a, b) => b.value - a.value);

    if (!available.length) {
      missingSubjects.push(alternatives.map((item) => item.subject).join(' / '));
      continue;
    }

    const valid = available.find(({ requirement, value }) => (
      requirement.min_score == null || value >= requirement.min_score
    ));

    if (!valid) {
      belowMinimumSubjects.push(alternatives.map((item) => item.subject).join(' / '));
      total += available[0].value;
    } else {
      total += valid.value;
    }
  }

  return {
    eligible: missingSubjects.length === 0 && belowMinimumSubjects.length === 0,
    score: missingSubjects.length === 0 ? total : null,
    missingSubjects,
    belowMinimumSubjects,
  };
}

export function classifyScore(score: number | null, cutoff: number | null | undefined, ambitiousGap = 20): ScoreFit {
  if (score == null) return 'not_requested';
  if (cutoff == null) return 'no_history';
  const gap = score - cutoff;
  if (gap >= 15) return 'safe';
  if (gap >= 0) return 'realistic';
  if (gap >= -ambitiousGap) return 'ambitious';
  return 'below';
}
