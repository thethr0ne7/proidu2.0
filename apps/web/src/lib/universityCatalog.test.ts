import { describe, expect, it } from 'vitest';
import { parseUniversityCatalog, searchUniversities } from './universityCatalog';
import { UNIVERSITY_REGIONS, type UniversityRegion } from '../data/regions';

const region: UniversityRegion = {
  id: 'test', name: 'Тестовая область', district: 'ТЕСТ', monitoringId: '1'
};

describe('university catalog parser', () => {
  it('contains all 89 official regional pages', () => {
    expect(UNIVERSITY_REGIONS).toHaveLength(89);
    expect(new Set(UNIVERSITY_REGIONS.map((item) => item.monitoringId)).size).toBe(89);
  });
  it('parses official html institution links', () => {
    const html = `
      <div><a href="inst.php?id=10">Федеральное государственное бюджетное образовательное учреждение высшего образования «Тестовый университет»</a><span>г. Тестоград</span></div>
      <div><a href="inst.php?id=11">Тестовый филиал федерального университета</a><span>г. Филиальск</span></div>
    `;
    const entries = parseUniversityCatalog(html, region);
    expect(entries).toHaveLength(2);
    expect(entries.some((entry) => entry.isBranch)).toBe(true);
  });

  it('parses jina markdown links', () => {
    const markdown = `
[Тестовый государственный университет](https://monitoring.miccedu.ru/iam/2025/_vpo/inst.php?id=42)
г. Тестоград
`;
    const entries = parseUniversityCatalog(markdown, region);
    expect(entries).toHaveLength(1);
    expect(entries[0].sourceUrl).toContain('id=42');
  });

  it('filters by name and city', () => {
    const entries = parseUniversityCatalog(`
[Тестовый государственный университет](https://monitoring.miccedu.ru/iam/2025/_vpo/inst.php?id=42)\nг. Тестоград
[Институт экономики](https://monitoring.miccedu.ru/iam/2025/_vpo/inst.php?id=43)\nг. Другой
`, region);
    expect(searchUniversities(entries, 'эконом')).toHaveLength(1);
    expect(searchUniversities(entries, 'тестоград')).toHaveLength(1);
  });
});
