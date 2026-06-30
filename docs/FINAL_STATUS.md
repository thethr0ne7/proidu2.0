# Final release status

Release: `v0.3.0-final-fixed`

## Verified flows

### Search input

The user enters scores for each selected ЕГЭ subject. The frontend calculates the quick total, but the API recalculates the score for every program independently:

- every mandatory subject must be present;
- every known minimum must be satisfied;
- one eligible subject is selected from each alternative group;
- the strongest eligible alternative is used;
- incompatible programs are excluded even in the `All` mode.

### Live API check

Control input:

```json
{
  "russian": 85,
  "math": 90,
  "informatics": 88
}
```

Live result:

- HTTP 200;
- 8 compatible programs;
- 4 universities;
- 4 cities;
- program-specific score: 263.

### Full route check

With honors, volunteering and gold GTO:

- HTTP 200;
- 5 priorities;
- 4 universities;
- 4 cities;
- different achievement points by university;
- maximum two positions per university;
- missing deadline, document or cutoff data is surfaced as a warning.

## Test status

- 11/11 relevant unit tests passed.
- TypeScript build passed.
- Vite production build passed.
- Live Search Edge Function passed.
- Live Route Edge Function passed.

## Important limitation

The application code is no longer limited to KBSU or one university. The current live competitive dataset is still limited by the number of university admission documents that have been ingested and verified. Expanding from 4 route-ready universities to every university is a data-ingestion task, not a frontend switch.
