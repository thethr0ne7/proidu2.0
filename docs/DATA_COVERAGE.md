# Data coverage contract

- `catalog_only`: institution identity is available, but no admission recommendation is allowed.
- `partial`: at least one admission layer exists, but some facts are missing.
- `verified`: displayed admission facts trace to official source records.
- `superseded`: record remains for history and must not be used in current output.

## Live snapshot — 30 June 2026

- Regions: 89
- Institutions and branches: 751
- Verified programs in the current developer scenario: 9
- Universities in compatible math/informatics/russian scenario: 4
- Cities in that scenario: Moscow, Dolgoprudny, Kazan, Saint Petersburg

The UI must never equate institution catalog coverage with program-level admission coverage.
