-- Verified multi-city demo dataset for the 2026 admission campaign.
-- Every displayed admission fact must retain an official source URL.

insert into public.regions(id,name,district,monitoring_id,published) values
('moscow-city','Москва','ЦФО','10301',true),
('moscow-region','Московская область','ЦФО','10302',true),
('tatarstan','Республика Татарстан','ПФО','10608',true),
('saint-petersburg','Санкт-Петербург','СЗФО','10201',true)
on conflict(id) do update set name=excluded.name,district=excluded.district,monitoring_id=excluded.monitoring_id,published=true;

insert into public.institutions(id,monitoring_id,official_name,short_name,normalized_name,aliases,region_id,city,official_site,coverage_status,published,source_checked_at,updated_at) values
('a52d2e65-4e56-5486-89fd-8ab603716849','seed:hse','Национальный исследовательский университет «Высшая школа экономики»','НИУ ВШЭ','национальный исследовательский университет «высшая школа экономики»',array['ВШЭ','НИУ ВШЭ','Высшая школа экономики'],'moscow-city','Москва','https://www.hse.ru','verified',true,now(),now()),
('04e2b8f2-59ba-5f04-8b3f-e4540f3cf12e','seed:mipt','Московский физико-технический институт (национальный исследовательский университет)','МФТИ','московский физико-технический институт (национальный исследовательский университет)',array['МФТИ','Физтех'],'moscow-region','Долгопрудный','https://mipt.ru','verified',true,now(),now()),
('85684b05-f5e4-5c78-8739-26bc079acc16','seed:kfu','Казанский (Приволжский) федеральный университет','КФУ','казанский (приволжский) федеральный университет',array['КФУ'],'tatarstan','Казань','https://kpfu.ru','verified',true,now(),now()),
('ae10f125-951c-5f03-b19b-bc7a7e95f0dd','seed:itmo','Национальный исследовательский университет ИТМО','ИТМО','национальный исследовательский университет итмо',array['ИТМО'],'saint-petersburg','Санкт-Петербург','https://itmo.ru','verified',true,now(),now())
on conflict(monitoring_id) do update set official_name=excluded.official_name,short_name=excluded.short_name,normalized_name=excluded.normalized_name,aliases=excluded.aliases,region_id=excluded.region_id,city=excluded.city,official_site=excluded.official_site,coverage_status='verified',published=true,source_checked_at=now(),updated_at=now();

insert into public.sources(id,institution_id,kind,title,url,admission_year,status,checked_at) values
('a14d0bfb-5d9d-5ea7-94a9-37bd7694ad5f','a52d2e65-4e56-5486-89fd-8ab603716849','exam_list','НИУ ВШЭ: вступительные испытания и минимальные баллы 2026','https://ba.hse.ru/minkrit',2026,'verified',now()),
('3998614a-e2f4-53a7-b6f3-d50681da4939','a52d2e65-4e56-5486-89fd-8ab603716849','seat_plan','НИУ ВШЭ: количество мест 2026','https://ba.hse.ru/kolmest',2026,'verified',now()),
('f6fbd925-e138-52cc-b16c-6f2a6d304da4','a52d2e65-4e56-5486-89fd-8ab603716849','cutoff','НИУ ВШЭ: проходные баллы 2025','https://ba.hse.ru/result2025',2025,'verified',now()),
('622f9ec7-97f3-5984-b232-2bd6a44622d5','a52d2e65-4e56-5486-89fd-8ab603716849','rules','НИУ ВШЭ: индивидуальные достижения 2026','https://ba.hse.ru/dost',2026,'verified',now()),
('268e43bf-89b7-5ab0-bb10-9442d96df513','85684b05-f5e4-5c78-8739-26bc079acc16','program_list','КФУ: 09.03.04 Программная инженерия','https://admissions.kpfu.ru/programs/09-03-04-programmnaya-inzheneriya-profil-sovr/',2026,'verified',now()),
('fe96b22d-53f8-5ae1-a9d8-2d2321b59185','85684b05-f5e4-5c78-8739-26bc079acc16','rules','КФУ: индивидуальные достижения 2026','https://admissions.kpfu.ru/bakalavriat-specialitet/priem-po-osobym-usloviyam/uchyot-individualnyx-dostizhenij/',2026,'verified',now()),
('3a9de613-f4ef-59d1-bcd9-f4362b9278d3','85684b05-f5e4-5c78-8739-26bc079acc16','rules','КФУ: сроки приема 2026','https://admissions.kpfu.ru/bakalavriat-specialitet/procedura-postupleniya/sroki-postupleniya/',2026,'verified',now()),
('69f006b6-a42f-50f7-990e-b0b4996248b7','04e2b8f2-59ba-5f04-8b3f-e4540f3cf12e','rules','МФТИ: правила приема 2026','https://pk.mipt.ru/bachelor/2026_rules/',2026,'verified',now()),
('76edaf5a-e70b-57ee-a394-55b597e69c38','04e2b8f2-59ba-5f04-8b3f-e4540f3cf12e','seat_plan','МФТИ: направления и места 2026','https://pk.mipt.ru/bachelor/2026_places/',2026,'verified',now()),
('d03e4377-cfe8-5d67-80b8-e1da85f0b916','04e2b8f2-59ba-5f04-8b3f-e4540f3cf12e','cutoff','МФТИ: статистика приема 2025','https://pk.mipt.ru/bachelor/statistics/2025_statistics/statisticsbachelor2025.htm',2025,'verified',now()),
('d989e4be-d244-5b27-8f49-38ddc3cf41f3','04e2b8f2-59ba-5f04-8b3f-e4540f3cf12e','rules','МФТИ: индивидуальные достижения 2026','https://pk.mipt.ru/bachelor/2026_ID/',2026,'verified',now()),
('510a1dea-c3a3-51cf-bd4e-dc0888d17e8d','ae10f125-951c-5f03-b19b-bc7a7e95f0dd','program_list','ИТМО: системное и прикладное программное обеспечение','https://abit.itmo.ru/program/bachelor/system_software',2026,'verified',now()),
('f6efbdd8-dabf-5a43-8905-2ce99f2a52eb','ae10f125-951c-5f03-b19b-bc7a7e95f0dd','exam_list','ИТМО: вступительные испытания бакалавриата','https://abit.itmo.ru/page/74',2026,'verified',now()),
('e39d0654-d854-5e4d-89a8-a6eaa9936ce7','ae10f125-951c-5f03-b19b-bc7a7e95f0dd','rules','ИТМО: индивидуальные достижения 2026','https://abit.itmo.ru/page/69',2026,'verified',now()),
('9d75478c-43b8-53e8-966f-54a8ffa97dd4','ae10f125-951c-5f03-b19b-bc7a7e95f0dd','rules','ИТМО: сроки приема 2026','https://abit.itmo.ru/page/113',2026,'verified',now())
on conflict(url,admission_year) do update set title=excluded.title,status='verified',checked_at=now();

insert into public.programs(id,institution_id,code,title,profile_title,level,study_form,admission_year,source_id,verification_status,published,updated_at) values
('0eb53405-42e6-5ba7-b79b-2b06a401bc16','a52d2e65-4e56-5486-89fd-8ab603716849','01.03.01','Математика',null,'bachelor','full_time',2026,'a14d0bfb-5d9d-5ea7-94a9-37bd7694ad5f','verified',true,now()),
('1abf68ac-e846-55c8-a918-ad4869fe6aa1','a52d2e65-4e56-5486-89fd-8ab603716849','09.03.04','Программная инженерия',null,'bachelor','full_time',2026,'a14d0bfb-5d9d-5ea7-94a9-37bd7694ad5f','verified',true,now()),
('b7de7fef-db58-5259-9cd6-f28d2bb416ac','a52d2e65-4e56-5486-89fd-8ab603716849','10.03.01','Информационная безопасность',null,'bachelor','full_time',2026,'a14d0bfb-5d9d-5ea7-94a9-37bd7694ad5f','verified',true,now()),
('7dba125a-343a-5fd8-b5a7-f4d4340e052e','a52d2e65-4e56-5486-89fd-8ab603716849','38.03.01','Экономика',null,'bachelor','full_time',2026,'a14d0bfb-5d9d-5ea7-94a9-37bd7694ad5f','verified',true,now()),
('176a308e-7aab-5edb-a118-899a4aab5bce','a52d2e65-4e56-5486-89fd-8ab603716849','38.03.05','Бизнес-информатика',null,'bachelor','full_time',2026,'a14d0bfb-5d9d-5ea7-94a9-37bd7694ad5f','verified',true,now()),
('7a1b9900-02f7-5927-80cf-6430653a2191','a52d2e65-4e56-5486-89fd-8ab603716849','40.03.01','Юриспруденция',null,'bachelor','full_time',2026,'a14d0bfb-5d9d-5ea7-94a9-37bd7694ad5f','verified',true,now()),
('a18eb9d3-67d6-5c88-b1b2-70668110aab1','85684b05-f5e4-5c78-8739-26bc079acc16','09.03.04','Программная инженерия','Современная разработка программного обеспечения','bachelor','full_time',2026,'268e43bf-89b7-5ab0-bb10-9442d96df513','verified',true,now()),
('2033cd31-69e8-5370-b1af-105211902879','04e2b8f2-59ba-5f04-8b3f-e4540f3cf12e','09.03.04','Программная инженерия','Разработка программно-информационных систем','bachelor','full_time',2026,'69f006b6-a42f-50f7-990e-b0b4996248b7','verified',true,now()),
('6f30478f-c4a8-5dab-8b4c-989ac9783c59','ae10f125-951c-5f03-b19b-bc7a7e95f0dd','09.03.04','Программная инженерия','Системное и прикладное программное обеспечение','bachelor','full_time',2026,'510a1dea-c3a3-51cf-bd4e-dc0888d17e8d','verified',true,now())
on conflict(id) do update set title=excluded.title,profile_title=excluded.profile_title,source_id=excluded.source_id,verification_status='verified',published=true,updated_at=now();

insert into public.exam_sets(id,program_id,admission_year,variant,source_id,verification_status) values
('2d60fea3-de62-5825-bcae-24852a3d2469','0eb53405-42e6-5ba7-b79b-2b06a401bc16',2026,1,'a14d0bfb-5d9d-5ea7-94a9-37bd7694ad5f','verified'),
('3468c9f0-ed72-5743-aad7-c430b8d9be7c','1abf68ac-e846-55c8-a918-ad4869fe6aa1',2026,1,'a14d0bfb-5d9d-5ea7-94a9-37bd7694ad5f','verified'),
('0da76fce-5c6d-5ec4-bd5d-cdb2b77304c6','b7de7fef-db58-5259-9cd6-f28d2bb416ac',2026,1,'a14d0bfb-5d9d-5ea7-94a9-37bd7694ad5f','verified'),
('94ef503d-3c05-5dd8-8bb1-ed3c2526a760','7dba125a-343a-5fd8-b5a7-f4d4340e052e',2026,1,'a14d0bfb-5d9d-5ea7-94a9-37bd7694ad5f','verified'),
('dc63f7ed-a6f3-5307-b692-8492ebd000ff','176a308e-7aab-5edb-a118-899a4aab5bce',2026,1,'a14d0bfb-5d9d-5ea7-94a9-37bd7694ad5f','verified'),
('d2e7438c-28ae-5357-acc6-8ad60da4c691','7a1b9900-02f7-5927-80cf-6430653a2191',2026,1,'a14d0bfb-5d9d-5ea7-94a9-37bd7694ad5f','verified'),
('3916e8cd-f36a-5dae-8eb2-2b8b17123e6b','a18eb9d3-67d6-5c88-b1b2-70668110aab1',2026,1,'268e43bf-89b7-5ab0-bb10-9442d96df513','verified'),
('0adb6e37-c38d-584e-a5da-4760abdd0baf','2033cd31-69e8-5370-b1af-105211902879',2026,1,'69f006b6-a42f-50f7-990e-b0b4996248b7','verified'),
('9b94d301-c09f-5250-a824-cc343611cf36','6f30478f-c4a8-5dab-8b4c-989ac9783c59',2026,1,'f6efbdd8-dabf-5a43-8905-2ce99f2a52eb','verified')
on conflict(program_id,admission_year,variant) do update set source_id=excluded.source_id,verification_status='verified';

-- Exam requirements. A shared choice_group means “one of these subjects”.
insert into public.exam_requirements(exam_set_id,subject,min_score,priority,choice_group,exam_kind) values
('2d60fea3-de62-5825-bcae-24852a3d2469','математика',75,1,null,'ege'),('2d60fea3-de62-5825-bcae-24852a3d2469','физика',70,2,1,'ege'),('2d60fea3-de62-5825-bcae-24852a3d2469','информатика',70,2,1,'ege'),('2d60fea3-de62-5825-bcae-24852a3d2469','русский язык',65,3,null,'ege'),
('3468c9f0-ed72-5743-aad7-c430b8d9be7c','математика',70,1,null,'ege'),('3468c9f0-ed72-5743-aad7-c430b8d9be7c','информатика',70,2,null,'ege'),('3468c9f0-ed72-5743-aad7-c430b8d9be7c','русский язык',60,3,null,'ege'),
('0da76fce-5c6d-5ec4-bd5d-cdb2b77304c6','физика',65,1,1,'ege'),('0da76fce-5c6d-5ec4-bd5d-cdb2b77304c6','информатика',65,1,1,'ege'),('0da76fce-5c6d-5ec4-bd5d-cdb2b77304c6','математика',65,2,null,'ege'),('0da76fce-5c6d-5ec4-bd5d-cdb2b77304c6','русский язык',60,3,null,'ege'),
('94ef503d-3c05-5dd8-8bb1-ed3c2526a760','математика',65,1,null,'ege'),('94ef503d-3c05-5dd8-8bb1-ed3c2526a760','обществознание',65,2,1,'ege'),('94ef503d-3c05-5dd8-8bb1-ed3c2526a760','информатика',65,2,1,'ege'),('94ef503d-3c05-5dd8-8bb1-ed3c2526a760','иностранный язык',65,2,1,'ege'),('94ef503d-3c05-5dd8-8bb1-ed3c2526a760','русский язык',65,3,null,'ege'),
('dc63f7ed-a6f3-5307-b692-8492ebd000ff','математика',70,1,null,'ege'),('dc63f7ed-a6f3-5307-b692-8492ebd000ff','информатика',75,2,null,'ege'),('dc63f7ed-a6f3-5307-b692-8492ebd000ff','русский язык',65,3,null,'ege'),
('d2e7438c-28ae-5357-acc6-8ad60da4c691','обществознание',60,1,null,'ege'),('d2e7438c-28ae-5357-acc6-8ad60da4c691','история',60,2,1,'ege'),('d2e7438c-28ae-5357-acc6-8ad60da4c691','иностранный язык',60,2,1,'ege'),('d2e7438c-28ae-5357-acc6-8ad60da4c691','русский язык',60,3,null,'ege'),
('3916e8cd-f36a-5dae-8eb2-2b8b17123e6b','математика',null,1,null,'ege'),('3916e8cd-f36a-5dae-8eb2-2b8b17123e6b','информатика',null,2,null,'ege'),('3916e8cd-f36a-5dae-8eb2-2b8b17123e6b','русский язык',null,3,null,'ege'),
('0adb6e37-c38d-584e-a5da-4760abdd0baf','математика',85,1,null,'ege'),('0adb6e37-c38d-584e-a5da-4760abdd0baf','информатика',85,2,null,'ege'),('0adb6e37-c38d-584e-a5da-4760abdd0baf','русский язык',70,3,null,'ege'),
('9b94d301-c09f-5250-a824-cc343611cf36','математика',null,1,null,'ege'),('9b94d301-c09f-5250-a824-cc343611cf36','информатика',null,2,null,'ege'),('9b94d301-c09f-5250-a824-cc343611cf36','русский язык',null,3,null,'ege')
on conflict(exam_set_id,subject,exam_kind) do update set min_score=excluded.min_score,priority=excluded.priority,choice_group=excluded.choice_group;

insert into public.admission_offers(program_id,admission_year,budget_places,paid_places,target_quota,special_quota,separate_quota,source_id,verification_status,published) values
('0eb53405-42e6-5ba7-b79b-2b06a401bc16',2026,60,25,null,null,null,'3998614a-e2f4-53a7-b6f3-d50681da4939','verified',true),
('1abf68ac-e846-55c8-a918-ad4869fe6aa1',2026,160,125,null,null,null,'3998614a-e2f4-53a7-b6f3-d50681da4939','verified',true),
('b7de7fef-db58-5259-9cd6-f28d2bb416ac',2026,80,70,null,null,null,'3998614a-e2f4-53a7-b6f3-d50681da4939','verified',true),
('7dba125a-343a-5fd8-b5a7-f4d4340e052e',2026,100,165,null,null,null,'3998614a-e2f4-53a7-b6f3-d50681da4939','verified',true),
('176a308e-7aab-5edb-a118-899a4aab5bce',2026,100,110,null,null,null,'3998614a-e2f4-53a7-b6f3-d50681da4939','verified',true),
('7a1b9900-02f7-5927-80cf-6430653a2191',2026,150,111,null,null,null,'3998614a-e2f4-53a7-b6f3-d50681da4939','verified',true),
('a18eb9d3-67d6-5c88-b1b2-70668110aab1',2026,80,135,null,null,null,'268e43bf-89b7-5ab0-bb10-9442d96df513','verified',true),
('2033cd31-69e8-5370-b1af-105211902879',2026,79,47,1,8,8,'76edaf5a-e70b-57ee-a394-55b597e69c38','verified',true),
('6f30478f-c4a8-5dab-8b4c-989ac9783c59',2026,164,245,6,17,17,'510a1dea-c3a3-51cf-bd4e-dc0888d17e8d','verified',true)
on conflict(program_id,admission_year) do update set budget_places=excluded.budget_places,paid_places=excluded.paid_places,target_quota=excluded.target_quota,special_quota=excluded.special_quota,separate_quota=excluded.separate_quota,source_id=excluded.source_id,verification_status='verified',published=true;

insert into public.cutoff_history(program_id,year,cutoff_score,basis,source_id,verification_status) values
('0eb53405-42e6-5ba7-b79b-2b06a401bc16',2025,282,'budget','f6fbd925-e138-52cc-b16c-6f2a6d304da4','verified'),
('1abf68ac-e846-55c8-a918-ad4869fe6aa1',2025,299,'budget','f6fbd925-e138-52cc-b16c-6f2a6d304da4','verified'),
('b7de7fef-db58-5259-9cd6-f28d2bb416ac',2025,276,'budget','f6fbd925-e138-52cc-b16c-6f2a6d304da4','verified'),
('7dba125a-343a-5fd8-b5a7-f4d4340e052e',2025,291,'budget','f6fbd925-e138-52cc-b16c-6f2a6d304da4','verified'),
('176a308e-7aab-5edb-a118-899a4aab5bce',2025,288,'budget','f6fbd925-e138-52cc-b16c-6f2a6d304da4','verified'),
('7a1b9900-02f7-5927-80cf-6430653a2191',2025,282,'budget','f6fbd925-e138-52cc-b16c-6f2a6d304da4','verified'),
('a18eb9d3-67d6-5c88-b1b2-70668110aab1',2025,276,'budget','268e43bf-89b7-5ab0-bb10-9442d96df513','verified'),
('2033cd31-69e8-5370-b1af-105211902879',2025,299,'budget','d03e4377-cfe8-5d67-80b8-e1da85f0b916','verified')
on conflict(program_id,year,basis) do update set cutoff_score=excluded.cutoff_score,source_id=excluded.source_id,verification_status='verified';

insert into public.individual_achievement_rules(institution_id,admission_year,achievement_type,title,points,conditions,source_id,verification_status) values
('a52d2e65-4e56-5486-89fd-8ab603716849',2026,'honors','Аттестат или диплом с отличием',3,'{}','622f9ec7-97f3-5984-b232-2bd6a44622d5','verified'),
('a52d2e65-4e56-5486-89fd-8ab603716849',2026,'volunteer','Волонтёрство не менее 100 часов в году',2,'{"min_hours":100}','622f9ec7-97f3-5984-b232-2bd6a44622d5','verified'),
('a52d2e65-4e56-5486-89fd-8ab603716849',2026,'gto_gold','Золотой знак ГТО',2,'{"level":"gold"}','622f9ec7-97f3-5984-b232-2bd6a44622d5','verified'),
('85684b05-f5e4-5c78-8739-26bc079acc16',2026,'honors','Документ об образовании с отличием',5,'{}','fe96b22d-53f8-5ae1-a9d8-2d2321b59185','verified'),
('85684b05-f5e4-5c78-8739-26bc079acc16',2026,'gto_gold','Золотой знак ГТО',3,'{"level":"gold"}','fe96b22d-53f8-5ae1-a9d8-2d2321b59185','verified'),
('85684b05-f5e4-5c78-8739-26bc079acc16',2026,'gto_silver','Серебряный знак ГТО',2,'{"level":"silver"}','fe96b22d-53f8-5ae1-a9d8-2d2321b59185','verified'),
('85684b05-f5e4-5c78-8739-26bc079acc16',2026,'gto_bronze','Бронзовый знак ГТО',1,'{"level":"bronze"}','fe96b22d-53f8-5ae1-a9d8-2d2321b59185','verified'),
('04e2b8f2-59ba-5f04-8b3f-e4540f3cf12e',2026,'honors','Аттестат или диплом с отличием',2,'{}','d989e4be-d244-5b27-8f49-38ddc3cf41f3','verified'),
('04e2b8f2-59ba-5f04-8b3f-e4540f3cf12e',2026,'volunteer','Волонтёрство от 100 часов не менее двух лет',2,'{"min_hours":100,"min_years":2}','d989e4be-d244-5b27-8f49-38ddc3cf41f3','verified'),
('04e2b8f2-59ba-5f04-8b3f-e4540f3cf12e',2026,'gto_gold','Знак ГТО',2,'{"level":"gold"}','d989e4be-d244-5b27-8f49-38ddc3cf41f3','verified'),
('04e2b8f2-59ba-5f04-8b3f-e4540f3cf12e',2026,'gto_silver','Знак ГТО',2,'{"level":"silver"}','d989e4be-d244-5b27-8f49-38ddc3cf41f3','verified'),
('04e2b8f2-59ba-5f04-8b3f-e4540f3cf12e',2026,'gto_bronze','Знак ГТО',2,'{"level":"bronze"}','d989e4be-d244-5b27-8f49-38ddc3cf41f3','verified'),
('ae10f125-951c-5f03-b19b-bc7a7e95f0dd',2026,'honors','Документ об образовании с отличием',3,'{}','e39d0654-d854-5e4d-89a8-a6eaa9936ce7','verified'),
('ae10f125-951c-5f03-b19b-bc7a7e95f0dd',2026,'volunteer','Волонтёрство от 40 часов и не менее 10 мероприятий',2,'{"min_hours":40,"min_events":10}','e39d0654-d854-5e4d-89a8-a6eaa9936ce7','verified'),
('ae10f125-951c-5f03-b19b-bc7a7e95f0dd',2026,'gto_gold','Знак ГТО 2025 или 2026',2,'{"level":"gold"}','e39d0654-d854-5e4d-89a8-a6eaa9936ce7','verified'),
('ae10f125-951c-5f03-b19b-bc7a7e95f0dd',2026,'gto_silver','Знак ГТО 2025 или 2026',2,'{"level":"silver"}','e39d0654-d854-5e4d-89a8-a6eaa9936ce7','verified'),
('ae10f125-951c-5f03-b19b-bc7a7e95f0dd',2026,'gto_bronze','Знак ГТО 2025 или 2026',2,'{"level":"bronze"}','e39d0654-d854-5e4d-89a8-a6eaa9936ce7','verified')
on conflict(institution_id,admission_year,achievement_type,title) do update set points=excluded.points,conditions=excluded.conditions,source_id=excluded.source_id,verification_status='verified';

-- 2026 deadlines for KFU, MIPT and ITMO. HSE intentionally remains missing and is surfaced as a warning.
insert into public.admission_deadlines(institution_id,admission_year,event_type,event_at,description,source_url,verification_status) values
('85684b05-f5e4-5c78-8739-26bc079acc16',2026,'applications_open','2026-06-20 00:00:00+03','Начало приема документов','https://admissions.kpfu.ru/bakalavriat-specialitet/procedura-postupleniya/sroki-postupleniya/','verified'),
('85684b05-f5e4-5c78-8739-26bc079acc16',2026,'internal_exam_documents_deadline','2026-07-13 17:00:00+03','Последний срок подачи при внутренних испытаниях','https://admissions.kpfu.ru/bakalavriat-specialitet/procedura-postupleniya/sroki-postupleniya/','verified'),
('85684b05-f5e4-5c78-8739-26bc079acc16',2026,'budget_documents_deadline','2026-07-25 17:00:00+03','Последний срок подачи по ЕГЭ на бюджет','https://admissions.kpfu.ru/bakalavriat-specialitet/procedura-postupleniya/sroki-postupleniya/','verified'),
('85684b05-f5e4-5c78-8739-26bc079acc16',2026,'priority_consent_deadline','2026-08-01 12:00:00+03','Согласие на приоритетном этапе','https://admissions.kpfu.ru/bakalavriat-specialitet/procedura-postupleniya/sroki-postupleniya/','verified'),
('85684b05-f5e4-5c78-8739-26bc079acc16',2026,'main_consent_deadline','2026-08-05 12:00:00+03','Согласие на основном этапе','https://admissions.kpfu.ru/bakalavriat-specialitet/procedura-postupleniya/sroki-postupleniya/','verified'),
('04e2b8f2-59ba-5f04-8b3f-e4540f3cf12e',2026,'applications_open','2026-06-20 00:00:00+03','Начало приема документов','https://pk.mipt.ru/bachelor/2026_rules/','verified'),
('04e2b8f2-59ba-5f04-8b3f-e4540f3cf12e',2026,'internal_exam_documents_deadline','2026-07-10 17:00:00+03','Последний срок подачи при внутренних испытаниях','https://pk.mipt.ru/bachelor/2026_rules/','verified'),
('04e2b8f2-59ba-5f04-8b3f-e4540f3cf12e',2026,'budget_documents_deadline','2026-07-25 17:00:00+03','Последний срок подачи по ЕГЭ на бюджет','https://pk.mipt.ru/bachelor/2026_rules/','verified'),
('04e2b8f2-59ba-5f04-8b3f-e4540f3cf12e',2026,'priority_consent_deadline','2026-08-01 12:00:00+03','Согласие на приоритетном этапе','https://pk.mipt.ru/bachelor/2026_rules/','verified'),
('04e2b8f2-59ba-5f04-8b3f-e4540f3cf12e',2026,'main_consent_deadline','2026-08-05 12:00:00+03','Согласие на основном этапе','https://pk.mipt.ru/bachelor/2026_rules/','verified'),
('ae10f125-951c-5f03-b19b-bc7a7e95f0dd',2026,'applications_open','2026-06-20 00:00:00+03','Начало приема документов','https://abit.itmo.ru/page/113','verified'),
('ae10f125-951c-5f03-b19b-bc7a7e95f0dd',2026,'internal_exam_documents_deadline','2026-07-10 17:00:00+03','Последний срок подачи при внутренних испытаниях','https://abit.itmo.ru/page/113','verified'),
('ae10f125-951c-5f03-b19b-bc7a7e95f0dd',2026,'budget_documents_deadline','2026-07-25 17:00:00+03','Последний срок подачи по ЕГЭ на бюджет','https://abit.itmo.ru/page/113','verified'),
('ae10f125-951c-5f03-b19b-bc7a7e95f0dd',2026,'priority_consent_deadline','2026-08-01 12:00:00+03','Согласие на приоритетном этапе','https://abit.itmo.ru/page/113','verified'),
('ae10f125-951c-5f03-b19b-bc7a7e95f0dd',2026,'main_consent_deadline','2026-08-05 12:00:00+03','Согласие на основном этапе','https://abit.itmo.ru/page/113','verified')
on conflict(institution_id,admission_year,event_type) do update set event_at=excluded.event_at,description=excluded.description,source_url=excluded.source_url,verification_status='verified';

insert into public.required_documents(institution_id,admission_year,applicant_category,document_code,label,conditions,source_url,verification_status)
select institution_id,2026,'general',document_code,label,conditions,source_url,'verified' from (values
('04e2b8f2-59ba-5f04-8b3f-e4540f3cf12e'::uuid,'passport','Паспорт или другой документ, удостоверяющий личность','{}'::jsonb,'https://pk.mipt.ru/bachelor/2026_rules/'),
('04e2b8f2-59ba-5f04-8b3f-e4540f3cf12e','education','Документ об образовании','{}','https://pk.mipt.ru/bachelor/2026_rules/'),
('04e2b8f2-59ba-5f04-8b3f-e4540f3cf12e','snils','СНИЛС при наличии','{"optional":true}','https://pk.mipt.ru/bachelor/2026_rules/'),
('04e2b8f2-59ba-5f04-8b3f-e4540f3cf12e','personal_data','Согласие на обработку персональных данных','{}','https://pk.mipt.ru/bachelor/2026_rules/'),
('04e2b8f2-59ba-5f04-8b3f-e4540f3cf12e','achievements','Подтверждения индивидуальных достижений','{"optional":true}','https://pk.mipt.ru/bachelor/2026_rules/'),
('04e2b8f2-59ba-5f04-8b3f-e4540f3cf12e','benefits','Документы на льготы или квоты','{"conditional":true}','https://pk.mipt.ru/bachelor/2026_rules/'),
('85684b05-f5e4-5c78-8739-26bc079acc16','passport','Паспорт или другой документ, удостоверяющий личность','{}','https://admissions.kpfu.ru/bakalavriat-specialitet/procedura-postupleniya/dokumenty-dlya-postupleniya/'),
('85684b05-f5e4-5c78-8739-26bc079acc16','education','Документ об образовании','{}','https://admissions.kpfu.ru/bakalavriat-specialitet/procedura-postupleniya/dokumenty-dlya-postupleniya/'),
('85684b05-f5e4-5c78-8739-26bc079acc16','snils','СНИЛС при наличии','{"optional":true}','https://admissions.kpfu.ru/bakalavriat-specialitet/procedura-postupleniya/dokumenty-dlya-postupleniya/'),
('85684b05-f5e4-5c78-8739-26bc079acc16','achievements','Подтверждения индивидуальных достижений','{"optional":true}','https://admissions.kpfu.ru/bakalavriat-specialitet/procedura-postupleniya/dokumenty-dlya-postupleniya/'),
('85684b05-f5e4-5c78-8739-26bc079acc16','benefits','Документы на льготы или особые права','{"conditional":true}','https://admissions.kpfu.ru/bakalavriat-specialitet/procedura-postupleniya/dokumenty-dlya-postupleniya/'),
('ae10f125-951c-5f03-b19b-bc7a7e95f0dd','passport','Паспорт или другой документ, удостоверяющий личность','{}','https://abit.itmo.ru/page/66'),
('ae10f125-951c-5f03-b19b-bc7a7e95f0dd','education','Документ об образовании','{}','https://abit.itmo.ru/page/66'),
('ae10f125-951c-5f03-b19b-bc7a7e95f0dd','snils','СНИЛС при наличии','{"optional":true}','https://abit.itmo.ru/page/66'),
('ae10f125-951c-5f03-b19b-bc7a7e95f0dd','achievements','Подтверждения индивидуальных достижений','{"optional":true}','https://abit.itmo.ru/page/66'),
('ae10f125-951c-5f03-b19b-bc7a7e95f0dd','benefits','Документы на льготы или квоты','{"conditional":true}','https://abit.itmo.ru/page/66')
) as d(institution_id,document_code,label,conditions,source_url)
on conflict(institution_id,admission_year,applicant_category,document_code) do update set label=excluded.label,conditions=excluded.conditions,source_url=excluded.source_url,verification_status='verified';
