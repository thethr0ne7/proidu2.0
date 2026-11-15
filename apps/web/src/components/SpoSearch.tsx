import { useState } from 'react';
import { searchSpoRoutes, type SpoRoutePage } from '../lib/federalApi';

export function SpoSearch({onBack}:{onBack:()=>void}) {
  const [spoCode,setSpoCode]=useState('');
  const [query,setQuery]=useState('');
  const [region,setRegion]=useState('');
  const [result,setResult]=useState<SpoRoutePage|null>(null);
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(false);
  async function submit() {
    setLoading(true); setError(''); setResult(null);
    try { setResult(await searchSpoRoutes({spoCode:spoCode.trim(),query,region,year:2026})); }
    catch(e) { setError(e instanceof Error?e.message:String(e)); }
    finally { setLoading(false); }
  }
  return <section className="form-section panel-enter federal-search">
    <button className="back-link" onClick={onBack}>← Назад</button>
    <div className="step-label">SPO EVIDENCE GATE · TEST BUILD</div>
    <h2>Маршрут после колледжа</h2>
    <p className="inline-hint">Внутренние испытания доступны только там, где подтверждены профильность СПО и действующие правила конкретного вуза. Пустой результат не означает право поступления без ЕГЭ.</p>
    <div className="field-block"><label className="block-label" htmlFor="spo-code">Код специальности СПО</label>
      <input id="spo-code" placeholder="Например, 09.02.07" value={spoCode} onChange={e=>setSpoCode(e.target.value)} /></div>
    <div className="field-block compact-fields">
      <div><label className="block-label" htmlFor="spo-query">Направление / вуз</label><input id="spo-query" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Наименование или код программы" /></div>
      <div><label className="block-label" htmlFor="spo-region">Город / регион</label><input id="spo-region" value={region} onChange={e=>setRegion(e.target.value)} placeholder="Вся Россия" /></div>
    </div>
    <button className="primary-button" onClick={submit} disabled={loading||!spoCode.trim()}>
      {loading?'Проверяем подтверждённые правила…':'Проверить маршрут СПО →'}</button>
    {error&&<div className="disclaimer-card error-card"><strong>Ошибка проверки</strong><span>{error}</span></div>}
    {result?.meta.warning&&<div className="catalog-status"><strong>Нужна проверка правил</strong><span>{result.meta.warning}</span></div>}
    <div className="program-list">
      {result?.data.map(item=><article className="program-card" key={item.program_id}>
        <div className="program-topline"><span className="band-pill">Источник подтверждён</span><span className="delta">{item.code}</span></div>
        <h3>{item.title}</h3>
        <p>{item.institution_short_name||item.institution_name} · {[item.city,item.region_name].filter(Boolean).join(', ')}</p>
        <p className="field-note">Внутренние испытания: {item.internal_exams.join(', ') || 'не указаны'}</p>
        <a className="demo-source" href={item.source_url} rel="noreferrer" target="_blank">Документ с правилами ↗</a>
      </article>)}
    </div>
  </section>;
}
