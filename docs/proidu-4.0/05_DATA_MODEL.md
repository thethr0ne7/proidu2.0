# 05. Target data model

## Design principle
The shared catalogue is the canonical data source. Russia and Global use different admission rules and workflows over the same institutions, campuses and programs. Personal applicant data is separated from public education data.

## Logical schemas
- reference — countries, Russian regions, languages, education levels, exam subjects, document types.
- catalogue — institutions, branches, campuses, addresses, licences, accreditation, programs and study modes.
- admissions_ru — campaigns, program offerings, funding bases, seat plans, exam sets, minimum scores, historical cutoffs, deadlines, achievements and document requirements.
- admissions_global — country admission profiles, foreign qualification systems, recognition pathways, language rules, foreign exam requirements, quotas, scholarships and invitation requirements.
- sources — source registry, source endpoints, source versions, content hashes, snapshots, evidence and field-level provenance.
- ingestion — jobs, attempts, retries, worker leases, dead-letter records and parser versions.
- identity — internal user IDs, login methods, Telegram identity links and staff roles.
- cases — applicant cases, tasks, application status, university contacts and assigned case managers.
- personal_data — applicant PII and document metadata; access restricted to explicitly authorised backend roles.
- audit — immutable security and data-change events.
- billing — payment intents and provider transactions, only when payment launch is approved.

## Institution identity
Use stable internal UUIDs plus external identifiers: legal entity INN/OGRN where available; official licence record identifier; official accreditation record identifier; source-specific institution identifiers; parent institution ID for branches.

Do not identify a branch only by its display name. Keep legal entity, branch, campus and study location distinct.

## Program and admission campaign
A program is the stable educational offer identity. Its admission data belongs to a campaign/year-specific offering. A program offering must record campaign year, institution/campus, level/code, study form/language, applicant category, admission basis, budget/paid/target/special/separate quota seats, tuition/payment schedule, required exams/alternatives, minimum scores, deadlines, document requirements and source/evidence references.

Never update a prior year's offering in place. Close it and create a new campaign record.

## Rules engine
Rules are data, not scattered UI conditionals. Every rule has jurisdiction, applicant category, education level, valid-from/valid-to, legal source, version, deterministic condition and explanation. Evaluation returns eligible, conditionally eligible, not eligible, insufficient evidence or manual review required.

The engine must explain which exact rule and source produced the result. It must not convert unknown into false or true.

## Source and evidence model
A source version stores canonical URL, source authority, fetched time, HTTP metadata, content hash, object-storage key, parser version and extraction result. Evidence binds a specific source version and locator to an entity field. A source update can invalidate evidence and mark dependent facts stale.

## International-specific entities
- country admission profile;
- foreign qualification type and education system;
- qualification-to-Russian-level mapping;
- recognition requirement and authority;
- translation/legalisation requirements by country;
- language test and minimum level;
- entrance exam variant;
- quota/treaty/paid pathway;
- visa invitation and migration checklist;
- applicant case and university response.

Do not hardcode equivalence of foreign diplomas as a simple country-to-level lookup. It can depend on document type, awarding institution, year, program and recognition rules.

## Data migration mapping

| Current table | Target logical table |
|---|---|
| regions | reference.regions |
| institutions | catalogue.institutions |
| programs | catalogue.programs |
| admission_offers | admissions_ru.program_offerings |
| exam_sets + exam_requirements | admissions_ru.exam_requirements |
| cutoff_history | admissions_ru.cutoff_history |
| admission_deadlines | admissions_ru.deadlines |
| required_documents | admissions_ru.document_requirements |
| individual_achievement_rules | admissions_ru.achievement_rules |
| sources + source_registry + institution_source_registry | sources.registry |
| extraction_evidence | sources.evidence |
| source_snapshots | sources.versions |
| ingestion_jobs + ingestion_queue + ingestion_runs | ingestion.jobs and ingestion.attempts |
| coverage_snapshots | audit.coverage_snapshots |
| validation_issues | audit.validation_issues |
| university_check_requests | cases.requests, after PII review |
| payment_intents | billing.payment_intents; currently zero rows |

Do not migrate af_* and gi_* tables into PROIDU. Keep AI Factory and Government Intelligence as separate systems with explicit APIs. Their data and storage are not part of the PROIDU allowlist.