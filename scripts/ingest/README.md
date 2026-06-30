# Federal ingestion pipeline

The importer is intentionally evidence-first. It never invents scores.

For every university it must discover and snapshot:
1. admission rules for 2026;
2. program list and all direction/specialty codes;
3. exam combinations and minimum scores;
4. 2026 budget/control figures;
5. historical cutoff scores, when officially published;
6. individual-achievement rules;
7. deadlines and required documents.

Each extracted fact stores URL, page/table reference, fetch date, parser version and verification status.

Adapters are added per source family: HTML tables, XLSX/CSV, PDF tables, JSON endpoints and university-specific layouts. LLM extraction may propose mappings, but only deterministic validators can publish facts as `verified`.
