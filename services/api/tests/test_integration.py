"""Postgres API integration: execute in CI against clean migrated PG16."""
import os
from uuid import UUID

import psycopg
import pytest
from fastapi.testclient import TestClient
from services.api.app import app

DB = os.getenv("DATABASE_URL")
TEST_INST = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
TEST_SOURCE = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"
TEST_REGION = "proidu-ci-test"


def program_id(n: int) -> str:
    return "00000000-0000-0000-0000-" + format(n, "012x")


@pytest.fixture(scope="module")
def test_client():
    if not DB:
        pytest.skip("Integration requires DATABASE_URL")
    with psycopg.connect(DB) as conn:
        conn.execute(
            """INSERT INTO public.regions(id,name,district) VALUES(%s,'PROIDU Test Region','Test')
            ON CONFLICT(id) DO NOTHING""",
            (TEST_REGION,),
        )
        conn.execute(
            """INSERT INTO public.institutions(id, official_name, region_id, city, coverage_status)
               VALUES (%s::uuid,'PROIDU CI University',%s,'Test City','verified')
               ON CONFLICT(id) DO NOTHING""",
            (TEST_INST, TEST_REGION),
        )
        conn.execute(
            """INSERT INTO public.sources(id,institution_id,kind,title,url,admission_year,status)
               VALUES(%s::uuid,%s::uuid,'rules','CI fixture',
               'https://example.test/ci-admissions',2026,'verified')
               ON CONFLICT(id) DO NOTHING""",
            (TEST_SOURCE, TEST_INST),
        )
        # 520 independently routable programs; 520th tests the old first-500 regression.
        conn.execute(
            """INSERT INTO public.programs(id,institution_id,code,title,admission_year,
                  verification_status,source_id)
               SELECT format('00000000-0000-0000-0000-%%s',lpad(to_hex(n),12,'0'))::uuid,
                      %s::uuid,'09.03.04','CI Test Program '||n,2026,'verified',%s::uuid
               FROM generate_series(1,520) n ON CONFLICT(id) DO NOTHING""",
            (TEST_INST, TEST_SOURCE),
        )
        conn.execute(
            """INSERT INTO public.exam_sets(program_id,admission_year,variant,verification_status)
               SELECT id,2026,1,'verified' FROM public.programs
               WHERE institution_id=%s::uuid ON CONFLICT(program_id,admission_year,variant) DO NOTHING""",
            (TEST_INST,),
        )
        for subject, minimum, priority in [
            ("русский язык", 40, 1), ("математика", 39, 2), ("информатика", 44, 3)
        ]:
            conn.execute(
                """INSERT INTO public.exam_requirements(exam_set_id,subject,min_score,priority,exam_kind)
                   SELECT es.id,%s,%s,%s,'ege' FROM public.exam_sets es
                   JOIN public.programs p ON p.id=es.program_id WHERE p.institution_id=%s::uuid
                   ON CONFLICT(exam_set_id,subject,exam_kind) DO NOTHING""",
                (subject, minimum, priority, TEST_INST),
            )
        conn.execute(
            """INSERT INTO public.admission_offers(program_id,admission_year,budget_places,verification_status)
               SELECT id,2026,10,'verified' FROM public.programs
               WHERE institution_id=%s::uuid ON CONFLICT(program_id,admission_year) DO NOTHING""",
            (TEST_INST,),
        )
    with TestClient(app) as client:
        yield client
    with psycopg.connect(DB) as conn:
        conn.execute("DELETE FROM public.institutions WHERE id=%s::uuid", (TEST_INST,))
        conn.execute("DELETE FROM public.regions WHERE id=%s", (TEST_REGION,))


def test_health_and_readiness(test_client):
    assert test_client.get("/healthz").status_code == 200
    assert test_client.get("/readyz").json()["status"] == "ready"


def test_route_520th_not_truncated(test_client):
    assert UUID(program_id(520))
    response = test_client.post("/api/v1/route", json={
        "programIds": [program_id(520)],
        "scores": {"russian": 85, "math": 90, "informatics": 88},
        "year": 2026, "achievements": {},
    })
    assert response.status_code == 200, response.text
    assert response.json()["data"]["items"][0]["program_id"] == program_id(520)


def test_search_cursor_pagination_beyond_500(test_client):
    cursor = None
    all_ids = set()
    for _ in range(4):
        request = {
            "action": "programs", "query": "CI Test Program",
            "year": 2026, "limit": 200, "scoreMode": "all",
            "scores": {"russian": 85, "math": 90, "informatics": 88},
        }
        if cursor:
            request["cursor"] = cursor
        response = test_client.post("/api/v1/search", json=request)
        assert response.status_code == 200, response.text
        result = response.json()
        all_ids.update(p["program_id"] for p in result["data"])
        cursor = result["meta"]["next_cursor"]
        if not cursor:
            break
    assert len(all_ids) == 520
    assert program_id(520) in all_ids


def test_spo_fails_closed_then_verified_rule(test_client):
    payload = {"spoCode": "09.02.07", "year": 2026, "region": "Test City"}
    before = test_client.post("/api/v1/search", json={"action": "spo_routes", **payload})
    assert before.status_code == 200
    assert before.json()["data"] == []
    assert before.json()["meta"]["fallback"] == "ege"

    with psycopg.connect(DB) as conn:
        conn.execute(
            """INSERT INTO public.spo_specialties(code,title) VALUES('09.02.07','IT test')
               ON CONFLICT(code) DO NOTHING"""
        )
        conn.execute(
            """INSERT INTO public.spo_admission_rules(program_id,spo_code,admission_year,
               route_type,profile_match,internal_exams,source_id,verification_status)
               VALUES(%s::uuid,'09.02.07',2026,'profile_internal',true,
               '["математика","русский язык"]'::jsonb,%s::uuid,'partial')
               ON CONFLICT(program_id,spo_code,admission_year,route_type) DO UPDATE SET verification_status='partial'""",
            (program_id(520), TEST_SOURCE),
        )
    partial = test_client.post("/api/v1/spo/routes", json=payload)
    assert partial.json()["data"] == []

    with psycopg.connect(DB) as conn:
        conn.execute(
            """UPDATE public.spo_admission_rules SET verification_status='verified'
               WHERE program_id=%s::uuid AND spo_code='09.02.07'""",
            (program_id(520),),
        )
    verified = test_client.post("/api/v1/spo/routes", json=payload)
    assert verified.status_code == 200, verified.text
    rows = verified.json()["data"]
    assert len(rows) == 1 and rows[0]["program_id"] == program_id(520)
    assert rows[0]["source_url"].startswith("https://")


def test_invalid_route_and_cursor_rejected(test_client):
    assert test_client.post("/api/v1/route", json={"programIds":["invalid"],"scores":{"math":90}}).status_code == 422
    assert test_client.post("/api/v1/search", json={"cursor":"invalid"}).status_code == 422
