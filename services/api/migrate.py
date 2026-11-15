"""Plain PostgreSQL migrations, compatible with managed Timeweb PostgreSQL.
Usage: DATABASE_URL=<admin DSN> python -m services.api.migrate
Never run this against live Supabase.
"""
from __future__ import annotations
import hashlib
import os
from pathlib import Path
import psycopg

MIGRATION_DIR = Path(__file__).resolve().parents[2] / "data" / "migrations"


def apply_migrations(conn: psycopg.Connection) -> None:
    with conn.transaction():
        conn.execute(
            "CREATE TABLE IF NOT EXISTS public.proidu_schema_migrations "
            "(name text PRIMARY KEY, sha256 text NOT NULL, installed_at timestamptz NOT NULL DEFAULT now())"
        )
    for migration in sorted(MIGRATION_DIR.glob("*.sql")):
        data = migration.read_bytes()
        digest = hashlib.sha256(data).hexdigest()
        already = conn.execute(
            "SELECT sha256 FROM public.proidu_schema_migrations WHERE name = %s",
            (migration.name,),
        ).fetchone()
        if already:
            if already[0] != digest:
                raise RuntimeError(f"Migration has changed since deployment: {migration.name}")
            continue
        with conn.transaction():
            conn.execute(data.decode("utf-8"))
            conn.execute(
                "INSERT INTO public.proidu_schema_migrations(name, sha256) VALUES (%s, %s)",
                (migration.name, digest),
            )
        print(f"APPLIED {migration.name}")


if __name__ == "__main__":
    url = os.environ["DATABASE_URL"]
    with psycopg.connect(url, autocommit=True) as connection:
        apply_migrations(connection)
