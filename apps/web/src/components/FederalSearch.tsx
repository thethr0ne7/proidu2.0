import { useEffect, useMemo, useState } from 'react';
import {
  buildFullRoute,
  createFullRouteInvoice,
  getFederalCoverage,
  searchFederalPrograms,
  type AchievementInput,
  type FederalCoverage,
  type FederalProgramResult,
  type FullRouteResponse,
  type ScoreMode,
} from '../lib/federalApi';
import {
  FIT_LABELS,
  formatExamRequirements,
  formatGap,
  summarizeCoverage,
} from '../lib/routePresentation';
import { openTelegramUrl } from '../lib/telegram';

const SUBJECTS = ['russian', 'math', 'physics', 'informatics', 'social', 'biology', 'chemistry', 'history', 'literature', 'foreign'] as const;
type SubjectKey = typeof SUBJECTS[number];

const LABELS: Record<SubjectKey, string> = {
  russian: 'Русский язык',
  math: 'Математика',
  physics: 'Физика',
  informatics: 'Информатика',
  social: 'Обществознание',
  biology: 'Биология',
  chemistry: 'Химия',
  history: 'История',
  literature: 'Литература',
  foreign: 'Иностранный язык',
};

const DEFAULT_SCORES: Record<SubjectKey, number> = {
  russian: 85,
  math: 90,
  physics: 0,
  informatics: 88,
  social: 0,
  biology: 0,
  chemistry: 0,
  history: 0,
  literature: 0,
  foreign: 0,
};

const SCORE_MODES: Array<{ id: ScoreMode; title: string; note: string }> = [
  { id: 'route', title: 'Маршрут', note: 'Реалистичные и амбициозные' },
  { id: 'reachable', title: 'Хватает', note: 'Не ниже проходного ориентира' },
  { id: 'all', title: 'Все', note: 'Все совместимые программы' },
];

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Moscow',
  }).format(new Date(value));
}

export function FederalSearch({ onBack }: { onBack: () => void }) {
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState('');
  const [subjects, setSubjects] = useState<SubjectKey[]>(['russian', 'math', 'informatics']);
  const [scores, setScores] = useState<Record<SubjectKey, number>>({ ...DEFAULT_SCORES });
  const [scoreMode, setScoreMode] = useState<ScoreMode>('all');
  const [results, setResults] = useState<FederalProgramResult[]>([]);
  const [coverageInfo, setCoverageInfo] = useState<FederalCoverage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);
  const [achievements, setAchievements] = useState<AchievementInput>({
    honors: false,
    volunteer: false,
    gtoLevel: 'none',
  });
  const [route, setRoute] = useState<FullRouteResponse | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const paymentsEnabled = import.meta.env.VITE_PAYMENTS_ENABLED === 'true';

  useEffect(() => {
    getFederalCoverage().then(setCoverageInfo).catch(() => undefined);
  }, []);

  const selectedScores = useMemo(() => Object.fromEntries(
    subjects.map((subject) => [subject, scores[subject]]),
  ), [scores, subjects]);
  const total = useMemo(() => subjects.reduce((sum, subject) => sum + (scores[subject] || 0), 0), [scores, subjects]);
  const resultCoverage = useMemo(() => summarizeCoverage(results), [results]);
  const validInput = subjects.length >= 3 && subjects.every((subject) => scores[subject] >= 0 && scores[subject] <= 100);

  const toggle = (subject: SubjectKey) => setSubjects((current) => {
    if (current.includes(subject)) return current.length > 3 ? current.filter((item) => item !== subject) : current;
    return current.length >= 4 ? current : [...current, subject];
  });

  const run = async () => {
    setLoading(true);
    setError('');
    setRoute(null);
    setSearched(true);
    try {
      const data = await searchFederalPrograms({
        query,
        region,
        totalScore: total,
        scores: selectedScores,
        subjects,
        budgetOnly: true,
        year: 2026,
        scoreMode,
        limit: 200,
      });
      setResults(data);
    } catch (e) {
      setResults([]);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const buildDemoRoute = async () => {
    if (!results.length) return;
    setRouteLoading(true);
    setError('');
    try {
      setRoute(await buildFullRoute({
        programIds: results.map((item) => item.program_id),
        scores: selectedScores,
        totalScore: total,
        achievements,
        year: 2026,
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRouteLoading(false);
    }
  };

  const buyRoute = async () => {
    try {
      const invoice = await createFullRouteInvoice({
        query,
        region,
        total,
        scores: selectedScores,
        subjects,
        achievements,
        selectedPrograms: results.slice(0, 20).map((item) => item.program_id),
      });
      openTelegramUrl(invoice);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <section className="form-section panel-enter federal-search">
      <button className="back-link" onClick={onBack}>← Назад</button>
      <div className="step-label">FEDERAL DATA CORE · LIVE</div>
      <h2>Куда я могу поступить?</h2>
      <p className="inline-hint">
        Укажи реальные баллы по предметам. Для каждой программы система отдельно проверит обязательные ЕГЭ, альтернативы и минимальные пороги.
      </p>

      {coverageInfo && (
        <div className="data-coverage-strip">
          <span><b>{coverageInfo.institutions_count}</b> организаций в каталоге</span>
          <span><b>{coverageInfo.verified_programs_count}</b> программ полностью проверено</span>
          <span><b>{coverageInfo.offers_2026_count}</b> программ с местами 2026</span>
        </div>
      )}

      <div className="field-block">
        <label className="block-label">Предметы и баллы ЕГЭ</label>
        <p className="field-note">Выбери 3–4 предмета. Если у программы есть выбор, например физика или информатика, будет взят подходящий лучший результат.</p>
        <div className="subject-score-grid">
          {SUBJECTS.map((subject) => {
            const selected = subjects.includes(subject);
            return (
              <div className={`subject-score-card ${selected ? 'active' : ''}`} key={subject}>
                <button type="button" onClick={() => toggle(subject)} aria-pressed={selected}>
                  <span className="subject-check">{selected ? '✓' : '+'}</span>
                  <span>{LABELS[subject]}</span>
                </button>
                {selected && (
                  <input
                    aria-label={`Баллы: ${LABELS[subject]}`}
                    type="number"
                    min="0"
                    max="100"
                    value={scores[subject]}
                    onChange={(event) => setScores((current) => ({
                      ...current,
                      [subject]: Math.max(0, Math.min(100, Number(event.target.value) || 0)),
                    }))}
                  />
                )}
              </div>
            );
          })}
        </div>
        <div className="score-total-line"><span>Твоя сумма выбранных ЕГЭ</span><strong>{total}</strong><small>/ {subjects.length * 100}</small></div>
      </div>

      <div className="field-block compact-fields">
        <div>
          <label className="block-label">Вуз, программа или шифр</label>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Оставь пустым для всей базы" />
        </div>
        <div>
          <label className="block-label">Регион или город</label>
          <input value={region} onChange={(event) => setRegion(event.target.value)} placeholder="Вся Россия" />
        </div>
      </div>

      <div className="field-block">
        <label className="block-label">Режим результата</label>
        <div className="federal-mode-switch">
          {SCORE_MODES.map((mode) => (
            <button type="button" key={mode.id} className={scoreMode === mode.id ? 'active' : ''} onClick={() => setScoreMode(mode.id)}>
              <strong>{mode.title}</strong><span>{mode.note}</span>
            </button>
          ))}
        </div>
      </div>

      <button className="primary-button" onClick={run} disabled={loading || !validInput}>
        {loading ? 'Проверяем все программы…' : 'Показать варианты'} <span>→</span>
      </button>

      {error && <div className="disclaimer-card error-card"><strong>Ошибка сценария</strong><span>{error}</span></div>}

      {results.length > 0 && (
        <>
          <div className="federal-coverage-summary">
            <div><strong>{results.length}</strong><span>программ</span></div>
            <div><strong>{resultCoverage.universities}</strong><span>вузов</span></div>
            <div><strong>{resultCoverage.cities}</strong><span>городов</span></div>
            <div><strong>{resultCoverage.regions}</strong><span>регионов</span></div>
          </div>
          <p className="result-explainer">Показаны все совместимые программы из проверенного конкурсного слоя, а не только один вуз.</p>
        </>
      )}

      {searched && !loading && results.length === 0 && !error && (
        <div className="catalog-status">
          <strong>Совместимые программы не найдены</strong>
          <span>Попробуй режим «Все», очисти вуз/регион или проверь баллы по каждому предмету.</span>
        </div>
      )}

      <div className="program-list">
        {results.map((result) => {
          const userScore = result.user_score ?? total;
          return (
            <article className={`program-card ${result.score_fit}`} key={result.program_id}>
              <div className="program-topline">
                <span className="band-pill">{FIT_LABELS[result.score_fit]}</span>
                <span className="delta">{result.code}</span>
              </div>
              <h3>{result.title}{result.profile_title ? ` — ${result.profile_title}` : ''}</h3>
              <p>{result.institution_short_name || result.institution_name} · {[result.city, result.region_name].filter(Boolean).join(', ')}</p>
              <div className="exam-set-line">{formatExamRequirements(result.exam_requirements)}</div>
              <div className="program-stats">
                <div><small>Твой балл</small><strong>{userScore}</strong></div>
                <div><small>Проходной {result.cutoff_year ?? ''}</small><strong>{result.cutoff_score ?? '—'}</strong></div>
                <div><small>Разница</small><strong>{formatGap(result.score_gap)}</strong></div>
                <div><small>Бюджет 2026</small><strong>{result.budget_places ?? '—'}</strong></div>
              </div>
              <div className="source-row">
                <span className={result.verification_status === 'verified' ? 'source-state verified' : 'source-state partial'}>
                  {result.verification_status === 'verified' ? 'Проверено' : 'Частично'}
                </span>
                {result.source_url && <a className="demo-source verified-source" href={result.source_url} target="_blank" rel="noreferrer">Источник ↗</a>}
              </div>
            </article>
          );
        })}
      </div>

      {results.length > 0 && (
        <section className="route-lab">
          <div className="route-lab-head">
            <span className="paid-tag">DEVELOPER MODE</span>
            <h3>Протестировать полный маршрут бесплатно</h3>
            <p>Маршрут строится из найденных программ, ограничивает доминирование одного вуза и отдельно считает ИД.</p>
          </div>
          <div className="achievement-controls">
            <label><input type="checkbox" checked={achievements.honors} onChange={(event) => setAchievements((current) => ({ ...current, honors: event.target.checked }))} /> Аттестат с отличием</label>
            <label><input type="checkbox" checked={achievements.volunteer} onChange={(event) => setAchievements((current) => ({ ...current, volunteer: event.target.checked }))} /> Волонтёрство</label>
            <label className="gto-control"><span>ГТО</span><select value={achievements.gtoLevel} onChange={(event) => setAchievements((current) => ({ ...current, gtoLevel: event.target.value as AchievementInput['gtoLevel'] }))}><option value="none">Нет</option><option value="gold">Золото</option><option value="silver">Серебро</option><option value="bronze">Бронза</option></select></label>
          </div>
          <button className="primary-button route-demo-button" onClick={buildDemoRoute} disabled={routeLoading}>{routeLoading ? 'Собираем маршрут…' : 'Собрать демо-маршрут'} <span>→</span></button>
          {paymentsEnabled ? (
            <button className="route-pay-link" onClick={buyRoute}>Открыть платную выдачу · 149 ⭐</button>
          ) : (
            <div className="payment-disabled-note">Платёж отключён в этой сборке до настройки Telegram Stars и webhook.</div>
          )}
        </section>
      )}

      {route && (
        <section className="route-result">
          <div className="route-result-header">
            <div><span className="step-label">ПОЛНЫЙ МАРШРУТ · DEMO</span><h2>Порядок подачи</h2></div>
            <div className="route-diversification"><strong>{route.diversification.institutions}</strong><span>вузов</span><strong>{route.diversification.cities}</strong><span>городов</span></div>
          </div>
          <p className="route-disclaimer">{route.disclaimer}</p>
          <div className="route-priority-list">
            {route.items.map((item) => (
              <article className={`route-priority-card ${item.route_score_fit}`} key={item.program_id}>
                <div className="route-priority-number">{item.priority}</div>
                <div className="route-priority-main">
                  <div className="program-topline"><span className="band-pill">{FIT_LABELS[item.route_score_fit]}</span><span className="delta">{item.code}</span></div>
                  <h3>{item.institution_short_name || item.institution_name}</h3>
                  <p>{item.title}{item.profile_title ? ` — ${item.profile_title}` : ''} · {[item.city, item.region_name].filter(Boolean).join(', ')}</p>
                  <div className="route-score-line"><span>ЕГЭ <b>{item.user_score ?? total}</b></span><span>ИД <b>+{item.id_points}</b></span><span>Итого <b>{item.effective_score}</b></span><span>К ориентиру <b>{formatGap(item.route_score_gap)}</b></span></div>
                  {item.id_breakdown.length > 0 ? <div className="id-breakdown">{item.id_breakdown.map((achievement) => <span key={`${item.program_id}-${achievement.type}`}>{achievement.title}: +{achievement.points}</span>)}</div> : <div className="id-breakdown empty">Для выбранных достижений баллы ИД не подтверждены.</div>}
                  <details className="route-detail"><summary>Дедлайны и документы</summary><div className="deadline-list">{item.deadlines.length > 0 ? item.deadlines.map((deadline) => <div key={`${item.institution_id}-${deadline.event_type}`}><strong>{formatDate(deadline.event_at)}</strong><span>{deadline.description}</span></div>) : <p>Дедлайны этого вуза пока не загружены.</p>}</div><div className="document-list">{item.documents.length > 0 ? item.documents.map((document) => <label key={`${item.institution_id}-${document.document_code}`}><input type="checkbox" /><span>{document.label}</span></label>) : <p>Список документов этого вуза пока не загружен.</p>}</div></details>
                </div>
              </article>
            ))}
          </div>
          {route.warnings.length > 0 && <div className="route-warnings"><strong>Ограничения текущих данных</strong>{route.warnings.map((warning) => <p key={warning}>• {warning}</p>)}</div>}
        </section>
      )}
    </section>
  );
}
