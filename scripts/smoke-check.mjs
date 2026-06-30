const searchUrl = process.env.SEARCH_URL || 'https://hgivyjjethjwswjrvroy.supabase.co/functions/v1/search';
const routeUrl = process.env.ROUTE_URL || 'https://hgivyjjethjwswjrvroy.supabase.co/functions/v1/route';

async function post(url, body) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await response.json();
  if (!response.ok) throw new Error(`${response.status}: ${json.error || 'request failed'}`);
  return json;
}

const scores = { russian: 85, math: 90, informatics: 88 };
const search = await post(searchUrl, {
  action: 'programs', scores, subjects: Object.keys(scores), scoreMode: 'all', budgetOnly: true, year: 2026, limit: 100,
});
const universities = new Set(search.data.map((item) => item.institution_id));
const cities = new Set(search.data.map((item) => item.city).filter(Boolean));
console.log(`search: ${search.data.length} programs, ${universities.size} universities, ${cities.size} cities`);
if (universities.size < 2 || cities.size < 2) throw new Error('multiversity coverage regression');

const route = await post(routeUrl, {
  programIds: search.data.map((item) => item.program_id), scores, totalScore: 263, year: 2026,
  achievements: { honors: true, volunteer: true, gtoLevel: 'gold' },
});
console.log(`route: ${route.data.items.length} priorities, ${route.data.diversification.institutions} universities, ${route.data.diversification.cities} cities`);
if (route.data.diversification.institutions < 2) throw new Error('route diversification regression');
