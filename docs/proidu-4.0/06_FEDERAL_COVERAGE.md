# 06. Federal coverage specification

## Coverage is a measured property
A list of institutions is not federal coverage. The coverage denominator must be derived from authoritative registers and must include legal entities, branches and active locations.

## Source hierarchy
1. Rosobrnadzor licence register: authoritative inventory of licensed education providers, levels, fields/specialties and branch information.
2. State accreditation register: public accreditation records for accredited educational programs.
3. Minobrnauki open data and official campaign publications.
4. Official university and college admission pages, admission rules, program lists, seat plans, tuition, deadlines and document lists.
5. Official government and regional portals for quotas, targeted training and other regulated routes.
6. Aggregators and commercial catalogues may discover candidates but are never final verification sources.

No undocumented or closed API is assumed. If a register is available only through a web interface or file, use a documented, lawful acquisition method and retain the original file/version.

## Coverage dimensions
- entity coverage: licensed institutions, branches and locations represented;
- program coverage: active educational programs represented for the campaign year;
- offer coverage: funding basis, seats and tuition;
- exam coverage: complete exam combinations, alternatives and minimum scores;
- deadline coverage: each applicable admission stage;
- document coverage: applicant-category-specific document list;
- route readiness: enough verified fields to calculate and explain a route;
- freshness: how recently the source was checked;
- evidence coverage: every published material field has traceable evidence.

## Publication statuses
- discovered — source/entity found, not validated;
- catalogued — institution/program identity resolved;
- partial — some admission fields are missing;
- verified — field set checked against official evidence;
- route_ready — all fields required by the route engine are present;
- stale — source is overdue or changed;
- withdrawn — institution/program/offer no longer active;
- manual_review — conflicting or ambiguous official evidence.

A program may be catalogued while its seats or deadlines remain partial. Do not collapse these statuses into one green check.

## Coverage targets
For a campaign release:
- 100% of active licensed higher-education organisations and their branches represented in the entity registry.
- 100% of institutions have official website and admission-page discovery status.
- 100% of active programs found from official campaign materials are represented.
- At least 95% of programs intended for route search meet route_ready requirements before campaign launch.
- 100% of published route results include source and freshness metadata.
- No result may display a fabricated seat count, cutoff, tuition or deadline.

Targets are acceptance goals, not claims about current state.

## Refresh cadence
During the admission campaign:
- seats, deadlines, admission notices and campaign changes: daily source check; immediate recrawl after detected source change;
- exam requirements and minimum scores: daily/weekly depending on university update rate;
- tuition and paid places: weekly and on change;
- institution licence/accreditation: monthly and on official registry change;
- historical cutoff: once published and verified after the campaign.

Off-season:
- institution identity and licence: monthly;
- program catalogue: monthly/quarterly;
- legal rules: event-driven monitoring with daily check of official publication sources.

## Ingestion pipeline
1. Enumerate licensed institutions and branches.
2. Resolve canonical official domains.
3. Discover admission pages, documents and campaign links.
4. Fetch and archive source versions.
5. Extract candidate facts with deterministic parsers first; use LLM only where layout or language requires it.
6. Validate schema, ranges, duplicates, campaign year and source authority.
7. Compare with prior version and create change events.
8. Human-review conflicts, low confidence and high-impact fields.
9. Publish verified fields and update coverage metrics.
10. Re-run dependent route tests when rules or source facts change.

## Queue recovery
The current queue has 11,221 rows and 6,008 ingestion jobs; 30 official-site jobs failed and one row needs review. The new worker must use idempotency keys, claim jobs with leases, cap retries and use exponential backoff, separate transient network errors from parser errors/source removal, maintain a dead-letter queue, expose per-institution completion/failure reasons and prevent one broken university website from blocking the national queue.

## Acceptance dashboard
Show total entities, branches, active programs, route-ready programs, verified offers, incomplete offers, stale fields, source failures, last successful crawl and coverage by region/institution type. A federal-coverage claim is blocked until the denominator and numerator can be reproduced from stored source evidence.