import os
from pathlib import Path

import psycopg
import pytest
from psycopg.rows import dict_row
from psycopg.conninfo import make_conninfo

from services.api.migrate import apply_migrations
from services.workers.mai import OFFICIAL_URL
from services.workers.runner import handle_once

FIXTURE = Path(__file__).parent / "fixtures" / "mai-programs-2026.html"


@pytest.mark.skipif(not os.environ.get("DATABASE_URL"), reason="requires PostgreSQL 17")
def test_mai_staging_never_auto_publishes_without_archived_evidence():
    admin_url = os.environ["DATABASE_URL"]
    database = "proidu_worker_ci"
    with psycopg.connect(admin_url, autocommit=True) as admin:
        admin.execute(f'DROP DATABASE IF EXISTS "{database}" WITH (FORCE)')
        admin.execute(f'CREATE DATABASE "{database}"')
    dsn = make_conninfo(admin_url, dbname=database)
    try:
        with psycopg.connect(dsn, autocommit=True, row_factory=dict_row) as conn:
            apply_migrations(conn)
            with conn.transaction():
                conn.execute(
                    """INSERT INTO collector.sources(
                       source_key,track,country_iso2,admission_year,
                       official_url,parser_key,status)
                       VALUES('mai-ci-2026','russia','RU',2026,%s,'mai_2026','active')""",
                    (OFFICIAL_URL,),
                )
                conn.execute(
                    """INSERT INTO collector.jobs(source_id,idempotency_key)
                       SELECT id,'mai-ci-2026:once' FROM collector.sources
                       WHERE source_key='mai-ci-2026'"""
                )
            fixture = FIXTURE.read_bytes()
            result = handle_once(conn, fetcher=lambda url: fixture)
            assert result["status"] == "quarantine"
            assert result["parsed"] == 2
            assert result["promoted"] == 0
            assert conn.execute(
                "SELECT count(*) AS n FROM collector.candidates"
            ).fetchone()["n"] == 2
            assert conn.execute(
                "SELECT count(*) AS n FROM collector.candidates WHERE validation_state='verified'"
            ).fetchone()["n"] == 0
            assert conn.execute(
                "SELECT count(*) AS n FROM collector.snapshots WHERE storage_key IS NOT NULL"
            ).fetchone()["n"] == 0
            assert handle_once(conn, fetcher=lambda url: fixture)["status"] == "idle"
    finally:
        with psycopg.connect(admin_url, autocommit=True) as admin:
            admin.execute(f'DROP DATABASE IF EXISTS "{database}" WITH (FORCE)')
