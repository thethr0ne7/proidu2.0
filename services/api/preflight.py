"""Read-only PostgreSQL preflight. Never print secrets.
Use DATABASE_URL=<runtime DSN> python -m services.api.preflight
"""
import json
import os
import psycopg
from psycopg.rows import dict_row

REQUIRED = [
    "institutions", "programs", "sources", "exam_sets", "exam_requirements",
    "admission_offers", "spo_specialties", "spo_admission_rules",
    "proidu_schema_migrations",
]

if __name__ == "__main__":
    with psycopg.connect(os.environ["DATABASE_URL"], row_factory=dict_row) as conn:
        meta = conn.execute(
            "SELECT current_user AS account, current_database() AS database,"
            "current_setting('server_version') AS version"
        ).fetchone()
        tables = conn.execute(
            "SELECT table_name FROM information_schema.tables WHERE table_schema='public'"
        ).fetchall()
        names = {row["table_name"] for row in tables}
        result = {
            "database": meta["database"],
            "account": meta["account"],
            "version": meta["version"],
            "missing_tables": sorted(set(REQUIRED) - names),
            "connectivity": "ok",
        }
        print(json.dumps(result, ensure_ascii=False, indent=2))
        if result["missing_tables"]:
            raise SystemExit(1)
