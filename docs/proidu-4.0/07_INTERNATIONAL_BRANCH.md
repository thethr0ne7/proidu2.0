# 07. PROIDU Global — foreign applicant branch

## Product objective
Guide a foreign applicant through a verified route to study in Russia, from country and qualification assessment to university application, admission decision and arrival. The platform is an information and case-management intermediary; it is not the government quota portal, visa authority or university admissions committee.

## Applicant intake
Collect only what is required at each stage:
- citizenship and current country of residence;
- country and year of completed education;
- qualification type and awarding institution;
- intended study level, field and language;
- Russian/English proficiency and available test results;
- preferred city/university and budget;
- desired pathway: quota, treaty, paid admission or university competition.

Do not request passport scans at first contact unless a documented workflow requires them. Keep identity data and documents in the restricted personal_data area, separate from the public catalogue.

## Admission pathways
1. Government quota: guide the applicant to the official Education in Russia / Russia-edu process and explain required steps. Do not claim direct system integration or submit through unofficial automation.
2. International treaty: determine whether the applicant's nationality and circumstances fall within applicable treaty provisions; attach the exact legal source.
3. Paid admission: use the university's current official admission rules, entrance exams, contract terms, tuition, payment timing and language requirements.
4. University-specific competition or olympiad: maintain separate eligibility and deadline rules.
5. Preparatory department / Russian language route: represent as a separate preparatory pathway, not as guaranteed admission to a degree program.

## Country qualification engine
Build a versioned country matrix:
- school-leaving certificate and years of schooling;
- secondary vocational and higher education credentials;
- transcript and grading scale;
- translation requirements;
- apostille or consular legalisation, where applicable;
- recognition requirement and competent authority;
- equivalence uncertainty and manual-review trigger.

Never hardcode a blanket statement that a diploma from a country is automatically equivalent to a Russian qualification. Recognition may depend on institution, document, year, qualification level and applicable international agreement.

## Applicant journey
Lead -> eligibility pre-check -> document checklist -> university shortlist -> application preparation -> official submission channel -> university review -> entrance exam -> admission decision -> contract/payment (if applicable) -> invitation -> visa -> migration registration -> arrival -> enrolment.

Every stage records owner, status, deadline, missing item, next action and evidence. University response is not inferred from a lead status.

## Country rollout
Do not launch every country simultaneously. Select 3–5 pilot markets using observed search/lead demand, official university recruitment priorities, partner access and local-language capability, visa/document complexity, payment feasibility, conversion economics and student support capacity.

The country list is intentionally not fixed in this blueprint; it requires market evidence and partner decisions.

## International data protection
Russian citizens' personal data collected online must be initially recorded and stored in databases located in Russia, subject to statutory exceptions. Cross-border transfers are separately regulated. For non-Russian applicants, assess the data-protection laws of the applicant's country and the lawful basis for transfer to Russia. Provide language-specific privacy notices and consent records.

Do not send passport images, education documents or applicant profiles to foreign AI APIs by default. Redact or minimise documents before external processing and keep an auditable processing record.

## Official portals and integration boundary
- Official Education in Russia portal: https://russia-edu.minobrnauki.gov.ru/
- The public portal currently presents 2026 programme information and materials about preparation for the 2027/28 campaign.
- A draft government resolution dated 2026-09-02 concerning a quota-admission service was found marked as unsigned. Treat it as a regulatory watch item, not an effective rule, until official publication and entry into force are verified.
- Do not automate login, scrape private applicant accounts or call undocumented government endpoints. Link to official submission channels and store user-confirmed status, unless written API access is granted.

## Initial Global MVP
- English and Russian UI; add market languages after pilot selection.
- Country/qualification intake.
- Verified university/program catalogue for foreign applicants.
- Quota vs treaty vs paid route distinction.
- Country-specific document checklist with uncertainty labels.
- Case manager and partner workspace.
- Deadline reminders and source evidence.
- No automatic visa/legal guarantee and no unsupported diploma recognition decision.