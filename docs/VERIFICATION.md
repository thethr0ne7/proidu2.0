# Release verification — multi-city route

Date: 30 June 2026

## Live Supabase checks

- `search` Edge Function: ACTIVE, version 2
- `route` Edge Function: ACTIVE, version 2
- Regions: 89
- Institutions/branches: 751
- Verified programs: 9
- 2026 offers: 9
- Verified 2025 cutoffs: 8

Test query:

```text
subjects: Russian + Mathematics + Informatics
total: 285
year: 2026
scoreMode: all
```

Result:

```text
8 compatible programs
4 universities
4 cities: Moscow, Dolgoprudny, Kazan, Saint Petersburg
```

Live route request result:

```text
HTTP 200
5 priorities
4 universities
4 cities
maximum 2 priorities per institution
```

Warnings are returned instead of invented values:

- HSE deadlines 2026 are not loaded;
- HSE document list 2026 is not loaded;
- ITMO historical cutoff is not loaded.

## Frontend checks

```text
14/14 Vitest tests passed
TypeScript build passed
Vite production build passed
```

The mobile browser scenario was tested at 390×844. API responses were intercepted with the same production response contract because the container browser cannot resolve external DNS. The backend was tested separately through a live Supabase HTTP request.

```text
4 program cards rendered
4 route cards rendered in the browser mock
all four city names visible
route opened
horizontal overflow: false
```

Screenshot: `docs/evidence/multicity-route-mobile.png`
