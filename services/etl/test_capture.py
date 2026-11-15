import os
from uuid import UUID

import psycopg
import pytest
from psycopg.rows import dict_row
from psycopg.conninfo import make_conninfo

from services.api.migrate import apply_migrations
from services.etl.capture import (
    canonical_bytes, hash_row, checked_tables, capture,
    verify, promote, table_digest,
)

def test_digest_is_stable_and_disallowed_source_rejected():
    assert hash_row({"a": 1, "b": "yes"}) == hash_row({"b": "yes", "a": 1})
    assert table_digest([("b", "22"), ("a", "11")]) == table_digest([("a", "11"), ("b", "22")])
    with pytest.raises(ValueError, match="Disallowed"):
        checked_tables("regions,gi_projects")
    with pytest.raises(ValueError, match="Disallowed"):
        checked_tables("af_events")


@pytest.mark.skipif(not os.getenv("DATABASE_URL"), reason="Needs disposable PostgreSQL 17")
def test_repeatable_read_source_to_isolated_target():
    admin_url = os.environ["DATABASE_URL"]
    source_db, target_db = "proidu_source_ci", "proidu_staging_ci"
    with psycopg.connect(admin_url, autocommit=True) as admin:
        for db in (source_db, target_db):
            admin.execute(f'DROP DATABASE IF EXISTS "{db}" WITH (FORCE)')
            admin.execute(f'CREATE DATABASE "{db}"')
    source_url = make_conninfo(admin_url, dbname=source_db)
    target_url = make_conninfo(admin_url, dbname=target_db)
    try:
        for url in (source_url, target_url):
            with psycopg.connect(url, autocommit=True) as connection:
                apply_migrations(connection)
        with psycopg.connect(source_url, row_factory=dict_row) as src:
            src.execute("INSERT INTO public.regions(id,name,district) VALUES('test-01','Test','Test')")
            src.execute(
                """INSERT INTO public.institutions(id,official_name,region_id)
                   VALUES('ffffffff-ffff-ffff-ffff-ffffffffffff','Fixture','test-01')"""
            )
            src.execute(
                """INSERT INTO public.sources(id,institution_id,kind,title,url,admission_year,status)
                   VALUES('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
                   'ffffffff-ffff-ffff-ffff-ffffffffffff','rules','CI Evidence',
                   'https://example.test/official',2026,'verified')"""
            )
            src.execute(
                """INSERT INTO public.programs(id,institution_id,code,title,
                   admission_year,source_id,verification_status)
                   VALUES('dddddddd-dddd-dddd-dddd-dddddddddddd',
                   'ffffffff-ffff-ffff-ffff-ffffffffffff','01.03.02','CI Admission',
                   2026,'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee','verified')"""
            )
            src.execute("CREATE TABLE public.gi_private_do_not_copy(secret text)")
            src.execute("INSERT INTO public.gi_private_do_not_copy VALUES('not exported')")
        result = capture(source_url, target_url, target_db,
                         ("regions", "institutions", "sources", "programs"))
        assert result["counts"] == {
            "regions": 1, "institutions": 1, "sources": 1, "programs": 1
        }
        assert UUID(result["batch_id"])
        with psycopg.connect(target_url, autocommit=True, row_factory=dict_row) as dst:
            with dst.transaction():
                checks = verify(dst, result["batch_id"])
                assert all(v["digest_match"] for v in checks.values())
            with dst.transaction():
                promoted = promote(dst, result["batch_id"])
            assert promoted["programs"] == 1
            assert dst.execute("SELECT id::text FROM public.programs").fetchone()["id"] == "dddddddd-dddd-dddd-dddd-dddddddddddd"
            assert dst.execute(
                "SELECT count(*) AS n FROM migration.source_rows WHERE source_table LIKE 'gi_%'"
            ).fetchone()["n"] == 0
            with pytest.raises(RuntimeError, match="Refusing nonempty target"):
                with dst.transaction():
                    promote(dst, result["batch_id"])
    finally:
        with psycopg.connect(admin_url, autocommit=True) as admin:
            for db in (source_db, target_db):
                admin.execute(f'DROP DATABASE IF EXISTS "{db}" WITH (FORCE)')
