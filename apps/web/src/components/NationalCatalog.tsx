import { useEffect, useMemo, useRef, useState } from 'react';
import { REGION_GROUPS, UNIVERSITY_REGIONS } from '../data/regions';
import {
  getOfficialRegionUrl,
  loadRegionUniversities,
  searchUniversities,
  type UniversityCatalogEntry
} from '../lib/universityCatalog';
import { haptic } from '../lib/telegram';
import { track } from '../lib/analytics';

interface NationalCatalogProps {
  onBack: () => void;
}

const LAST_REGION_KEY = 'proidu:last-university-region';

export function NationalCatalog({ onBack }: NationalCatalogProps) {
  const [regionId, setRegionId] = useState(() => localStorage.getItem(LAST_REGION_KEY) || 'moscow-city');
  const [entries, setEntries] = useState<UniversityCatalogEntry[]>([]);
  const [allEntries, setAllEntries] = useState<UniversityCatalogEntry[]>([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [progress, setProgress] = useState('');
  const requestId = useRef(0);

  const region = UNIVERSITY_REGIONS.find((item) => item.id === regionId) ?? UNIVERSITY_REGIONS[4];
  const visibleEntries = useMemo(
    () => searchUniversities(regionId === 'all' ? allEntries : entries, query),
    [allEntries, entries, query, regionId]
  );

  useEffect(() => {
    if (regionId === 'all') return;
    localStorage.setItem(LAST_REGION_KEY, regionId);
    void loadSelectedRegion(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regionId]);

  async function loadSelectedRegion(force: boolean) {
    const currentRequest = ++requestId.current;
    setStatus('loading');
    setMessage('Загружаем официальный список вузов и филиалов…');
    setProgress('');
    try {
      const result = await loadRegionUniversities(region, { force });
      if (currentRequest !== requestId.current) return;
      setEntries(result);
      setStatus('ready');
      setMessage(`Загружено: ${result.length}`);
      track('university_region_loaded', { region: region.id, count: result.length, force });
    } catch (error) {
      if (currentRequest !== requestId.current) return;
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Не удалось загрузить список.');
      track('university_region_failed', { region: region.id });
    }
  }

  async function loadWholeCountry() {
    haptic('medium');
    setStatus('loading');
    setAllEntries([]);
    setMessage('Загружаем регионы по очереди. Списки сохраняются на устройстве.');
    let loadedRegions = 0;
    let failedRegions = 0;
    const combined: UniversityCatalogEntry[] = [];
    const queue = [...UNIVERSITY_REGIONS];
    const workers = Array.from({ length: 4 }, async () => {
      while (queue.length > 0) {
        const next = queue.shift();
        if (!next) break;
        try {
          const result = await loadRegionUniversities(next);
          combined.push(...result);
          loadedRegions += 1;
        } catch {
          failedRegions += 1;
        }
        setProgress(`${loadedRegions + failedRegions}/${UNIVERSITY_REGIONS.length} регионов · ${combined.length} организаций`);
      }
    });

    await Promise.all(workers);
    const unique = Array.from(new Map(combined.map((entry) => [entry.sourceUrl, entry])).values())
      .sort((a, b) => a.name.localeCompare(b.name, 'ru'));
    setAllEntries(unique);
    setStatus(unique.length > 0 ? 'ready' : 'error');
    setMessage(
      unique.length > 0
        ? `Каталог России: ${unique.length} организаций. Не ответили регионов: ${failedRegions}.`
        : 'Не удалось загрузить каталог через доступные источники.'
    );
    track('university_country_loaded', { count: unique.length, loadedRegions, failedRegions });
  }

  function changeRegion(value: string) {
    haptic('light');
    setQuery('');
    setRegionId(value);
    setMessage('');
    if (value === 'all') {
      setEntries([]);
      setStatus(allEntries.length > 0 ? 'ready' : 'idle');
    }
  }

  return (
    <section className="catalog-section panel-enter">
      <button className="back-link" onClick={onBack}>← На главную</button>
      <div className="eyebrow">Национальный каталог</div>
      <h2>Все вузы России</h2>
      <p className="catalog-lead">
        Выбери регион и найди вуз или филиал по названию. Список загружается из официального мониторинга высшего образования 2025 года.
      </p>

      <div className="catalog-summary">
        <div><strong>89</strong><span>регионов</span></div>
        <div><strong>1 257</strong><span>организаций и филиалов в мониторинге</span></div>
      </div>

      <div className="field-block">
        <label className="block-label" htmlFor="catalog-region">Регион</label>
        <select id="catalog-region" value={regionId} onChange={(event) => changeRegion(event.target.value)}>
          <option value="all">Вся Россия — загрузить общий каталог</option>
          {REGION_GROUPS.map((district) => (
            <optgroup key={district} label={district}>
              {UNIVERSITY_REGIONS.filter((item) => item.district === district).map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {regionId === 'all' && allEntries.length === 0 && (
        <button className="primary-button" disabled={status === 'loading'} onClick={loadWholeCountry}>
          {status === 'loading' ? 'Загружаем всю Россию…' : 'Загрузить все вузы'} <span>→</span>
        </button>
      )}

      {regionId !== 'all' && (
        <div className="catalog-actions">
          <button className="secondary-button compact-action" disabled={status === 'loading'} onClick={() => loadSelectedRegion(true)}>
            Обновить официальный список
          </button>
          <a className="source-link" href={getOfficialRegionUrl(region)} target="_blank" rel="noreferrer">Открыть источник ↗</a>
        </div>
      )}

      {(entries.length > 0 || allEntries.length > 0) && (
        <div className="field-block catalog-search-block">
          <label className="block-label" htmlFor="university-query">Поиск</label>
          <input
            id="university-query"
            className="catalog-search"
            type="search"
            placeholder="Например: МИФИ, медицинский, филиал…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      )}

      {(message || progress) && (
        <div className={`catalog-status ${status}`}>
          <strong>{status === 'loading' ? 'Синхронизация' : status === 'error' ? 'Источник недоступен' : 'Каталог готов'}</strong>
          <span>{progress || message}</span>
        </div>
      )}

      {status === 'error' && regionId !== 'all' && (
        <a className="primary-button link-button" href={getOfficialRegionUrl(region)} target="_blank" rel="noreferrer">
          Открыть официальный список <span>↗</span>
        </a>
      )}

      <div className="university-list" aria-live="polite">
        {visibleEntries.map((entry) => (
          <article className="university-card" key={entry.id}>
            <div className="university-card-topline">
              <span className={entry.isBranch ? 'branch-badge' : 'university-badge'}>
                {entry.isBranch ? 'Филиал' : 'Вуз'}
              </span>
              <span>{entry.regionName}</span>
            </div>
            <h3>{entry.name}</h3>
            {entry.city && <p>{entry.city}</p>}
            <a href={entry.sourceUrl} target="_blank" rel="noreferrer">Карточка в официальном мониторинге ↗</a>
          </article>
        ))}
      </div>

      {status === 'ready' && visibleEntries.length === 0 && (
        <div className="empty-card"><strong>По этому запросу ничего не найдено.</strong></div>
      )}

      <p className="catalog-footnote">
        Каталог организаций — федеральный охват. Проходные баллы, экзамены и места добавляются отдельно только после проверки документов конкретного вуза; приложение не подставляет выдуманные цифры.
      </p>
    </section>
  );
}
