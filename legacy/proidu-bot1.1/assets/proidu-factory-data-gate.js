const SUPABASE_URL = "https://hgivyjjethjwswjrvroy.supabase.co";
const SUPABASE_ANON = "sb_publishable_3XDHXvXvsGBUjY8rMt5Efw_sJKyq3RV";
const BUILD = {
  name: "PROIDU_ROUTE_ENGINE_SPO_BUILD",
  version: "2026.07.09-spo-route-verified",
  mode: "Telegram-first verified admission navigator",
  shipped_at: "2026-07-09T12:58:00Z"
};
const COVERAGE = {
  organizations_catalog: 751,
  programs_search_layer: 82,
  universities_with_programs: 11,
  route_ready_universities: 4,
  ingestion_total: 10514,
  ingestion_pending: 10484,
  ingestion_failed: 30,
  spo_route_gate: "SPO profile gate active",
  verified_mode: "DATA Coverage Gate active"
};
const FACTORY = {
  core_loop: ["INPUT", "PLAN", "PRODUCE", "CHECK", "FIX", "SAVE", "SHIP"],
  core_contours: ["Repo Intake", "Evidence-Locked Extraction", "Evaluation", "Stateful Control", "Repair", "Factory Memory", "Defensive Security"],
  second_ring: ["UI Taste Gate", "Compound Skill Loop", "Recent Signal Radar", "Context Budget"],
  deploy_safety: ["APP READY", "DOMAIN CHECK", "CERT AUTOMATION", "SECRET SCAN", "RENEWAL TEST", "HTTPS SHIP"],
  activation_rules: {
    second_ring: "Amplifiers only; no Factory 3.0 expansion.",
    deploy_safety: "Activate for real web artifact / GitHub Pages / custom domain ship.",
    data_gate: "University appears in подбор only after programs + exams + seats + sources are loaded.",
    spo_gate: "SPO route appears only after profile mapping + internal exam rules + source are loaded. If profile is not confirmed, show EGE fallback instead of fake admission confidence."
  }
};
const SUBJECTS = [
  ["russian","Русский"],["math","Математика"],["physics","Физика"],["informatics","Информатика"],["social","Обществознание"],["biology","Биология"],["chemistry","Химия"],["history","История"],["literature","Литература"],["foreign","Иностранный"]
];
const SPO_SPECIALTIES = [
  ["09.02.07", "Информационные системы и программирование", ["09.03.02", "09.03.03", "09.03.04", "38.03.05"]],
  ["38.02.01", "Экономика и бухгалтерский учёт", ["38.03.01", "38.03.02", "38.03.05"]],
  ["40.02.01", "Право и организация социального обеспечения", ["40.03.01", "39.03.02", "38.03.04"]],
  ["34.02.01", "Сестринское дело", ["34.03.01", "31.05.01", "32.05.01"]],
  ["31.02.05", "Стоматология ортопедическая", ["31.05.03", "31.05.01", "32.05.01"]],
  ["33.02.01", "Фармация", ["33.05.01", "04.03.01", "32.05.01"]],
  ["44.02.01", "Дошкольное образование", ["44.03.01", "44.03.02", "39.03.02"]]
];
const DEMO_EGE = [
  {program_id:"demo-090304", code:"09.03.04", title:"Программная инженерия", profile_title:"AI-ready маршрут", institution_name:"Route-ready вуз", institution_short_name:"PROIDU Gate", city:"Москва", region_name:"Москва", cutoff_year:2025, cutoff_score:255, budget_places:38, score_fit:"realistic", score_gap:30, verification_status:"partial", source_url:"https://hgivyjjethjwswjrvroy.supabase.co/functions/v1/search", exam_requirements:[{subject:"русский язык",min_score:40,priority:1},{subject:"математика",min_score:39,priority:2},{subject:"информатика",min_score:44,priority:3}]}
];
const DEMO_SPO = [
  {program_id:"spo-demo-090303", code:"09.03.03", title:"Прикладная информатика", profile_title:"после колледжа", institution_short_name:"SPO Route Gate", institution_name:"Route-ready вуз", city:"Нальчик", region_name:"КБР", route_type:"profile_internal", profile_match:"confirmed", internal_exams:["русский язык", "математика", "информатика"], budget_places:24, verification_status:"partial", source_url:"https://hgivyjjethjwswjrvroy.supabase.co/functions/v1/search", warning:"Demo fallback: заменить на verified правила приёма конкретного вуза."},
  {program_id:"spo-demo-400301", code:"40.03.01", title:"Юриспруденция", profile_title:"смена траектории", institution_short_name:"EGE Fallback", institution_name:"Route-ready вуз", city:"Москва", region_name:"Москва", route_type:"ege_fallback", profile_match:"not_confirmed", internal_exams:[], budget_places:0, verification_status:"requires_ege", source_url:"https://hgivyjjethjwswjrvroy.supabase.co/functions/v1/search", warning:"Профиль СПО не подтверждён: показывать как ЕГЭ/fallback-маршрут, а не как поступление без ЕГЭ."}
];
const state = {audience:"spo", query:"", region:"", totalScore:285, subjects:["russian","math","informatics"], scoreMode:"route", spoCode:"09.02.07", spoTitle:"Информационные системы и программирование", wantsProfile:true, loading:false, error:"", results:[], spoRoutes:[]};
const $ = (sel)=>document.querySelector(sel);
function headers(){return {"content-type":"application/json", apikey:SUPABASE_ANON, authorization:`Bearer ${SUPABASE_ANON}`};}
async function apiSearch(payload){
  const res = await fetch(`${SUPABASE_URL}/functions/v1/search`, {method:"POST", headers:headers(), body:JSON.stringify({action:"programs", year:2026, budgetOnly:true, limit:100, ...payload})});
  const json = await res.json().catch(()=>({}));
  if(!res.ok) throw new Error(json.error || `Federal API HTTP ${res.status}`);
  return json.data || [];
}
async function apiSpoRoute(payload){
  const res = await fetch(`${SUPABASE_URL}/functions/v1/search`, {method:"POST", headers:headers(), body:JSON.stringify({action:"spo_routes", year:2026, limit:100, ...payload})});
  const json = await res.json().catch(()=>({}));
  if(!res.ok) throw new Error(json.error || `SPO API HTTP ${res.status}`);
  return json.data || [];
}
function fit(program){
  const gap = Number(program.score_gap ?? (state.totalScore - (program.cutoff_score ?? state.totalScore)));
  if(program.score_fit === "safe" || gap >= 15) return ["safe","Запасной"];
  if(program.score_fit === "ambitious" || gap < 0) return ["partial","Амбициозный"];
  return ["","Реалистичный"];
}
function exams(req){
  if(!Array.isArray(req) || !req.length) return "Экзамены уточняются в источнике";
  return req.map(e => `${e.subject || e.name}${e.min_score ? ` от ${e.min_score}` : ""}`).join(" + ");
}
function spoMapping(code){return SPO_SPECIALTIES.find(x=>x[0]===code) || SPO_SPECIALTIES[0];}
function unique(arr, key){return new Set(arr.map(x=>x[key]).filter(Boolean)).size;}
function render(){
  document.getElementById("root").innerHTML = `
  <main class="app">
    <section class="hero">
      <div class="eyebrow">ПРОЙДУ? · ROUTE ENGINE + SPO BUILD</div>
      <h1>Не только ЕГЭ. Теперь есть маршрут после колледжа.</h1>
      <p>Сборка разделяет два сценария: школьник с ЕГЭ и выпускник СПО с дипломом колледжа. Для СПО включён профильный gate: без подтверждения соответствия направления приложение не обещает поступление без ЕГЭ.</p>
      <div class="mode-tabs">
        <button class="tab ${state.audience==='ege'?'active':''}" data-audience="ege">Я поступаю по ЕГЭ</button>
        <button class="tab ${state.audience==='spo'?'active':''}" data-audience="spo">У меня диплом СПО</button>
      </div>
      <div class="grid">
        ${metric(COVERAGE.organizations_catalog,"организаций в каталоге")}
        ${metric(COVERAGE.programs_search_layer,"программы 2026 в поиске")}
        ${metric(COVERAGE.route_ready_universities,"route-ready вуза")}
        ${metric(COVERAGE.ingestion_total,"задач ingestion")}
      </div>
      <div class="gate">
        <span class="pill good">DATA Coverage Gate</span>
        <span class="pill good">SPO Profile Gate</span>
        <span class="pill warn">${COVERAGE.ingestion_pending} pending</span>
        <span class="pill warn">${COVERAGE.ingestion_failed} failed</span>
        <span class="pill good">GitHub Pages HTTPS-ready</span>
      </div>
    </section>

    <section class="layout">
      <aside class="panel">
        ${state.audience === "spo" ? spoForm() : egeForm()}
      </aside>
      <section class="panel">
        <div class="topline"><div><div class="eyebrow">Route Results</div><h2>${state.audience === "spo" ? "Маршруты после СПО" : "Результаты по ЕГЭ"}</h2></div><span class="pill">${state.audience === "spo" ? state.spoRoutes.length : state.results.length} программ</span></div>
        ${state.audience === "spo" ? spoSummary() : summary()}
        <div class="result">${state.audience === "spo" ? (state.spoRoutes.length ? state.spoRoutes.map(spoCard).join("") : emptySpo()) : (state.results.length ? state.results.map(programCard).join("") : emptyEge())}</div>
      </section>
    </section>

    <section class="route-map">
      <article class="card"><div class="eyebrow">Ideal user path</div><h3>Баллы / диплом → verified data → route score → 3 маршрута → документы → дедлайны → действие сегодня</h3><p class="small">Фабрика остаётся внутри. Пользователь видит не ingestion-кухню, а понятный путь поступления.</p></article>
      <article class="card"><div class="eyebrow">SPO formula</div><h3>Код СПО → профильность → внутренние экзамены → программы → ЕГЭ fallback</h3><p class="small">Если профиль не подтверждён источником конкретного вуза, route engine показывает fallback, а не ложную уверенность.</p></article>
    </section>

    <section class="factory">
      ${factoryCard("Core Loop", FACTORY.core_loop.join(" → "))}
      ${factoryCard("7 основных контуров", FACTORY.core_contours.join("\n"))}
      ${factoryCard("Second Ring", FACTORY.second_ring.join("\n"))}
      ${factoryCard("HTTPS Автопилот", FACTORY.deploy_safety.join(" → "))}
      ${factoryCard("DATA Coverage Gate", FACTORY.activation_rules.data_gate)}
      ${factoryCard("SPO Profile Gate", FACTORY.activation_rules.spo_gate)}
    </section>
    <p class="footer">${BUILD.name}. Следующий реальный этап — закрыть ingestion по вузам: program_list, exam_list, seat_plan, cutoff_results, achievement_rules, deadlines, required_documents, tuition, admission_rules_spo, spo_to_bachelor_mapping.</p>
  </main>`;
  bind();
}
function egeForm(){return `<div class="eyebrow">EGE Route Engine</div><h2>Поиск программ</h2><div class="field"><label>Вуз, программа или шифр</label><input id="query" value="${esc(state.query)}" placeholder="МФТИ, 09.03.04, юриспруденция" /></div><div class="field"><label>Регион или город</label><input id="region" value="${esc(state.region)}" placeholder="Москва, Татарстан, Нальчик" /></div><div class="field"><label>Сумма трёх ЕГЭ</label><input id="score" type="number" min="0" max="300" value="${state.totalScore}" /></div><div class="field"><label>Предметы</label><div class="subjects">${SUBJECTS.map(([id,name])=>`<button class="chip ${state.subjects.includes(id)?"active":""}" data-subject="${id}">${name}</button>`).join("")}</div></div><div class="field"><label>Режим</label><select id="mode"><option value="route">Маршрут</option><option value="reachable">Хватает</option><option value="all">Все</option></select></div><button class="primary" id="search">${state.loading?"Идёт проверка…":"Найти по ЕГЭ →"}</button><p class="status ${state.error?"error":""}">${state.error || "DATA Gate: без программ, экзаменов, мест и источников вуз не попадёт в подбор."}</p><button class="secondary" id="demo">Показать demo fallback</button>`;}
function spoForm(){const map=spoMapping(state.spoCode); return `<div class="eyebrow">SPO Route Engine</div><h2>После колледжа</h2><div class="field"><label>Код специальности СПО</label><select id="spoCode">${SPO_SPECIALTIES.map(([code,title])=>`<option value="${code}" ${state.spoCode===code?"selected":""}>${code} · ${title}</option>`).join("")}</select></div><div class="field"><label>Своя специальность / уточнение</label><input id="spoTitle" value="${esc(state.spoTitle)}" placeholder="Например: Информационные системы и программирование" /></div><div class="field"><label>Регион или город</label><input id="region" value="${esc(state.region)}" placeholder="Нальчик, Москва, Краснодар" /></div><div class="field"><label>Интересующее направление</label><input id="query" value="${esc(state.query)}" placeholder="IT, юриспруденция, экономика, медицина" /></div><div class="related"><div class="small">Родственные направления-кандидаты:</div>${map[2].map(code=>`<span class="pill">${code}</span>`).join("")}</div><button class="primary" id="searchSpo">Построить маршрут после СПО →</button><p class="status ${state.error?"error":""}">${state.error || "SPO Gate: без profile mapping, внутренних экзаменов и источника программа не получит уверенный статус без ЕГЭ."}</p><button class="secondary" id="demoSpo">Показать SPO demo fallback</button>`;}
function metric(n,label){return `<div class="card metric"><strong>${n.toLocaleString("ru-RU")}</strong><span>${label}</span></div>`}
function factoryCard(title, text){return `<article class="card"><div class="eyebrow">${title}</div><div class="flow">${esc(text)}</div></article>`}
function emptyEge(){return `<div class="card warnbox"><strong>Запусти поиск по ЕГЭ.</strong><p class="small">Если Supabase Function недоступна, сборка покажет ошибку без выдуманных вузов. Это нормальное поведение Gate.</p></div>`}
function emptySpo(){return `<div class="card warnbox"><strong>Построй маршрут после СПО.</strong><p class="small">Маршрут СПО должен отличать профильное поступление по внутренним экзаменам от ЕГЭ fallback. Нельзя обещать без ЕГЭ без источника вуза.</p></div>`}
function summary(){ if(!state.results.length) return ""; return `<div class="grid"><div class="card metric"><strong>${state.results.length}</strong><span>программ</span></div><div class="card metric"><strong>${unique(state.results,"institution_id") || unique(state.results,"institution_name")}</strong><span>вузов</span></div><div class="card metric"><strong>${unique(state.results,"city")}</strong><span>городов</span></div><div class="card metric"><strong>${unique(state.results,"region_name")}</strong><span>регионов</span></div></div>`;}
function spoSummary(){ if(!state.spoRoutes.length) return ""; const profile=state.spoRoutes.filter(x=>x.route_type==="profile_internal").length; const fallback=state.spoRoutes.filter(x=>x.route_type==="ege_fallback").length; return `<div class="grid"><div class="card metric"><strong>${state.spoRoutes.length}</strong><span>маршрутов</span></div><div class="card metric"><strong>${profile}</strong><span>профильных</span></div><div class="card metric"><strong>${fallback}</strong><span>ЕГЭ fallback</span></div><div class="card metric"><strong>${unique(state.spoRoutes,"city")}</strong><span>городов</span></div></div>`;}
function programCard(p){ const [cls,label]=fit(p); return `<article class="card program"><div class="topline"><span class="band ${cls}">${label}</span><span class="small">${esc(p.code || "код уточняется")}</span></div><h3>${esc(p.title || "Программа")}${p.profile_title?` — ${esc(p.profile_title)}`:""}</h3><p class="small">${esc(p.institution_short_name || p.institution_name || "Вуз")} · ${esc([p.city,p.region_name].filter(Boolean).join(", "))}</p><div class="small">${esc(exams(p.exam_requirements))}</div><div class="stats"><div class="stat"><span class="small">Твоя сумма</span><strong>${state.totalScore}</strong></div><div class="stat"><span class="small">Проходной ${p.cutoff_year || ""}</span><strong>${p.cutoff_score ?? "—"}</strong></div><div class="stat"><span class="small">Разница</span><strong>${p.score_gap ?? "—"}</strong></div><div class="stat"><span class="small">Бюджет 2026</span><strong>${p.budget_places ?? "—"}</strong></div></div><div class="source"><span>${p.verification_status === "verified" ? "Проверено" : "Частично / требует ingestion"}</span>${p.source_url?`<a target="_blank" rel="noreferrer" href="${esc(p.source_url)}">Источник ↗</a>`:""}</div></article>`;}
function spoCard(p){ const cls=p.route_type==="profile_internal"?"safe":"partial"; const label=p.route_type==="profile_internal"?"Профильный маршрут":"ЕГЭ fallback"; return `<article class="card program"><div class="topline"><span class="band ${cls}">${label}</span><span class="small">${esc(p.code || "код уточняется")}</span></div><h3>${esc(p.title || "Программа")}${p.profile_title?` — ${esc(p.profile_title)}`:""}</h3><p class="small">${esc(p.institution_short_name || p.institution_name || "Вуз")} · ${esc([p.city,p.region_name].filter(Boolean).join(", "))}</p><div class="small"><strong>СПО:</strong> ${esc(state.spoCode)} · ${esc(state.spoTitle)}</div><div class="small"><strong>Внутренние испытания:</strong> ${p.internal_exams?.length ? esc(p.internal_exams.join(" + ")) : "не подтверждены; проверять ЕГЭ/источник"}</div><div class="stats"><div class="stat"><span class="small">Профиль</span><strong>${p.profile_match === "confirmed" ? "да" : "нет"}</strong></div><div class="stat"><span class="small">Тип</span><strong>${p.route_type === "profile_internal" ? "ВИ" : "ЕГЭ"}</strong></div><div class="stat"><span class="small">Бюджет</span><strong>${p.budget_places ?? "—"}</strong></div><div class="stat"><span class="small">Статус</span><strong>${p.verification_status === "verified" ? "verified" : "gate"}</strong></div></div>${p.warning?`<p class="status warntext">${esc(p.warning)}</p>`:""}<div class="source"><span>${p.verification_status === "verified" ? "Источник проверен" : "Нужен verified источник"}</span>${p.source_url?`<a target="_blank" rel="noreferrer" href="${esc(p.source_url)}">Источник ↗</a>`:""}</div></article>`;}
function esc(s){return String(s ?? "").replace(/[&<>"]/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c]));}
function bind(){
  document.querySelectorAll("[data-audience]").forEach(btn=>btn.onclick=()=>{state.audience=btn.dataset.audience; state.error=""; render();});
  const query=$("#query"); if(query) query.oninput=e=>state.query=e.target.value;
  const region=$("#region"); if(region) region.oninput=e=>state.region=e.target.value;
  const score=$("#score"); if(score) score.oninput=e=>state.totalScore=Number(e.target.value||0);
  const mode=$("#mode"); if(mode){mode.value=state.scoreMode; mode.onchange=e=>state.scoreMode=e.target.value;}
  const spoCode=$("#spoCode"); if(spoCode) spoCode.onchange=e=>{state.spoCode=e.target.value; state.spoTitle=spoMapping(state.spoCode)[1]; render();};
  const spoTitle=$("#spoTitle"); if(spoTitle) spoTitle.oninput=e=>state.spoTitle=e.target.value;
  document.querySelectorAll("[data-subject]").forEach(btn=>btn.onclick=()=>{const id=btn.dataset.subject; state.subjects=state.subjects.includes(id)?state.subjects.filter(x=>x!==id):[...state.subjects,id].slice(-4); render();});
  const demo=$("#demo"); if(demo) demo.onclick=()=>{state.results=DEMO_EGE; state.error=""; render();};
  const demoSpo=$("#demoSpo"); if(demoSpo) demoSpo.onclick=()=>{state.spoRoutes=DEMO_SPO; state.error=""; render();};
  const search=$("#search"); if(search) search.onclick=async()=>{state.loading=true; state.error=""; render(); try{state.results=await apiSearch({query:state.query, region:state.region, totalScore:state.totalScore, subjects:state.subjects, scoreMode:state.scoreMode}); if(!state.results.length) state.error="По текущему DATA Gate ничего не найдено: каталог шире поиска, данные ещё не verified.";}catch(e){state.results=[]; state.error=e.message || String(e);} finally{state.loading=false; render();}};
  const searchSpo=$("#searchSpo"); if(searchSpo) searchSpo.onclick=async()=>{state.loading=true; state.error=""; render(); try{state.spoRoutes=await apiSpoRoute({spoCode:state.spoCode, spoTitle:state.spoTitle, query:state.query, region:state.region, profileOnly:state.wantsProfile}); if(!state.spoRoutes.length) state.error="SPO Route Gate пока не нашёл verified маршрутов: нужны admission_rules_spo и spo_to_bachelor_mapping. Можно смотреть demo fallback.";}catch(e){state.spoRoutes=[]; state.error=(e.message || String(e)) + " · Нужна Supabase action=spo_routes или fallback через programs.";} finally{state.loading=false; render();}};
}
try{window.Telegram?.WebApp?.ready?.(); window.Telegram?.WebApp?.expand?.(); window.Telegram?.WebApp?.setHeaderColor?.("#020202");}catch{}
render();
