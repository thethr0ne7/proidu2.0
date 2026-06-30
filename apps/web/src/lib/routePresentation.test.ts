import { describe, expect, it } from 'vitest';
import { formatExamRequirements, formatGap, summarizeCoverage } from './routePresentation';
import type { FederalProgramResult } from './federalApi';

describe('federal route presentation', () => {
  it('formats alternative exams as a choice instead of four mandatory subjects', () => {
    expect(formatExamRequirements([
      { subject: 'математика', min_score: 75, priority: 1, choice_group: null, exam_kind: 'ege' },
      { subject: 'физика', min_score: 70, priority: 2, choice_group: 1, exam_kind: 'ege' },
      { subject: 'информатика', min_score: 70, priority: 2, choice_group: 1, exam_kind: 'ege' },
      { subject: 'русский язык', min_score: 65, priority: 3, choice_group: null, exam_kind: 'ege' },
    ])).toContain('Информатика от 70 / Физика от 70');
  });

  it('counts distinct universities and cities', () => {
    const base = { subjects: [] as string[], exam_requirements: [], minimum_scores: {}, level: 'bachelor', study_form: 'full_time', admission_year: 2026, score_fit: 'realistic' as const, verification_status: 'verified' as const, code: '09.03.04', title: 'Программная инженерия' };
    const rows = [
      { ...base, institution_id: 'a', institution_name: 'A', city: 'Москва', region_id: 'm', program_id: '1' },
      { ...base, institution_id: 'b', institution_name: 'B', city: 'Казань', region_id: 't', program_id: '2' },
      { ...base, institution_id: 'a', institution_name: 'A', city: 'Москва', region_id: 'm', program_id: '3' },
    ] as FederalProgramResult[];
    expect(summarizeCoverage(rows)).toEqual({ universities: 2, cities: 2, regions: 2 });
  });

  it('renders signed score gaps', () => {
    expect(formatGap(9)).toBe('+9');
    expect(formatGap(-14)).toBe('-14');
    expect(formatGap(null)).toBe('нет ориентира');
  });
});
