# MAI source adapter extraction

Source of the prototype: legacy/ai-platform-core-proidu/src/proidu-mai.ts.

The old implementation is a useful parser fixture and test reference, not a federal ingestion engine. It supports one official MAI HTML page and admission year 2026. It uses a Supabase persistence adapter whose expected tables/RPC are not present in the inspected live database.

Target implementation:
- move parser to a pure adapter with campaign year passed as input, not a literal 2026 type;
- keep the official domain allowlist and bounded fetch policy;
- add source version, content hash, evidence locator and parser version;
- quarantine malformed or conflicting rows;
- do not automatically publish high-impact fields without the PROIDU verification policy;
- persist through the new PostgreSQL repository interface;
- add tests for 2027 and future campaign fixtures;
- add PDF/HTML parser adapters as separate modules, not conditionals in one MAI parser.

Do not enable scheduled production runs until the live source has been manually checked and the new worker passes idempotency, retry, lease recovery and dead-letter tests.
