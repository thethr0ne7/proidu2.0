import { describe, expect, it } from 'vitest';
import { calculateProgramScore, classifyScore } from './programScore';
import type { ExamRequirement } from './federalApi';

const requirements: ExamRequirement[] = [
  { subject: 'математика', min_score: 70, priority: 1, choice_group: null, exam_kind: 'ege' },
  { subject: 'информатика', min_score: 65, priority: 2, choice_group: 1, exam_kind: 'ege' },
  { subject: 'физика', min_score: 65, priority: 2, choice_group: 1, exam_kind: 'ege' },
  { subject: 'русский язык', min_score: 60, priority: 3, choice_group: null, exam_kind: 'ege' },
];

describe('calculateProgramScore', () => {
  it('uses the strongest eligible alternative subject', () => {
    const result = calculateProgramScore(requirements, {
      'математика': 90,
      'информатика': 88,
      'физика': 75,
      'русский язык': 82,
    });
    expect(result.eligible).toBe(true);
    expect(result.score).toBe(260);
  });

  it('rejects a program when a mandatory minimum is not met', () => {
    const result = calculateProgramScore(requirements, {
      'математика': 60,
      'информатика': 88,
      'русский язык': 82,
    });
    expect(result.eligible).toBe(false);
    expect(result.belowMinimumSubjects).toContain('математика');
  });

  it('rejects a program when no alternative exam is supplied', () => {
    const result = calculateProgramScore(requirements, {
      'математика': 90,
      'русский язык': 82,
    });
    expect(result.eligible).toBe(false);
    expect(result.missingSubjects).toContain('информатика / физика');
  });
});

describe('classifyScore', () => {
  it('classifies safe, realistic and ambitious results', () => {
    expect(classifyScore(300, 280)).toBe('safe');
    expect(classifyScore(285, 280)).toBe('realistic');
    expect(classifyScore(270, 280)).toBe('ambitious');
  });
});
