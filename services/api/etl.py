"""Transactional, fail-closed source -> target PROIDU migration.

SOURCE and TARGET connection strings come ONLY from environment variables.
Source connection is ALWAYS repeatable-read, read-only; no server-side file access.
No other application namespaces are copied.

Commands:
  python -m services.api.etl preflight
  python -m services.api.etl apply     # empty target ONLY
  python -m services.api.etl verify    # compare source + target
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from dataclasses import dataclass
from typing import Any

import psycopg
from psycopg import sql
from psycopg.rows import dict_row

# A pinned, explicit set of PROIDU tables. NEVER infer by wildcard.
# Dependencies are ordered for FK constraints. Keep shared GI/AF OUT.
BASE_TABLES = (
    "regions",
    "institutions",
    "sources",
    "programs",
    "admission_offers",
    "exam_sets",
    "exam_requirements",
    "cutoff_history",
    "individual_achievement_rules",
    "admission_deadlines",
    "required_documents",
    "ingestion_runs",
    "source_snapshots",
    "validation_issues",
    "institution_monitoring_metrics",
    "institution_ugs_groups",
    "factory_runs",
    "source_registry",
    "institution_source_registry",
    "ingestion_queue",
    "ingestion_jobs",
    "extraction_evidence",
    "coverage_snapshots",
    "platform_ingestion_jobs",
    "platform_data_versions",
    "platform_evidence_records",
    "platform_source_checkpoints",
)
# Sensitive accounts/payment ledgers are intentionally excluded until they
# have a separate legal / privacy / authorization migration review.
PRIVATE_TABLES = ("payment_intents", "university_check_requests")
REQUIRED_MIGRATIONS = (
    "0001_federal_core.sql",
    "0002_spo_admissions.sql",
    "0003_proidu_legacy_ingestion.sql",
    "0004_worker_factory_global.sql",
)


@dataclass(frozen=True)
class TableState:
    name: str
    rows: int
    checksum: str


def selected_tables(include_private: bool) -> tuple[str, ...]:
    return BASE_TABLES + (PRIVATE_TABLES if include_private else ())


def table_ident(table: str):
    if table not in BASE_TABLES + PRIVATE_TABLES:
        raise ValueError("Table not in approved PROIDU allowlist")
    return sql.Identifier("public", table)


def get_columns(conn: psycopg.Connection, table: str) -> list[dict]:
    return conn.execute(
        """SELECT column_name, udt_schema, udt_name, is_nullable
           FROM information_schema.columns
           WHERE table_schema='public' AND table_name=%s
           ORDER BY ordinal_position""",
        (table,),
    ).fetchall()


def get_order(conn: psycopg.Connection, table: str) -> list[str]:
    rows = conn.execute(
        """SELECT a.attname
           FROM pg_index i
           JOIN pg_class c ON c.oid=i.indrelid
           JOIN pg_namespace n ON n.oid=c.relnamespace
           JOIN LATERAL unnest(i.indkey) WITH ORDINALITY k(attnum,ord) ON true
           JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum=k.attnum
           WHERE n.nspname='public' AND c.relname=%s AND i.indisprimary
           ORDER BY k.ord""",
        (table,),
    ).fetchall()
    if not rows:
        raise ValueError(f"No primary key on {table}: a deterministic copy cannot proceed")
    return [r["attname"] for r in rows]


def ordered_copy_query(table: str, fields: list[str], ordering: list[str]) -> sql.Composed:
    # Parent institutions must be inserted before dependent branches.
    sort = (
        sql.SQL("(parent_id IS NOT NULL), ") if table == "institutions" else sql.SQL("")
    )
    return sql.SQL("COPY (SELECT {} FROM {} ORDER BY {}{}) TO STDOUT WITH (FORMAT CSV, NULL '\\N')").format(
        sql.SQL(",").join(map(sql.Identifier, fields)),
        table_ident(table),
        sort,
        sql.SQL(",").join(map(sql.Identifier, ordering)),
    )


def read_checksums(conn: psycopg.Connection, table: str, fields: list[str], ordering: list[str]) -> TableState:
    digest = hashlib.sha256()
    with conn.cursor() as cur:
        with cur.copy(ordered_copy_query(table, fields, ordering)) as source:
            while data := source.read():
                digest.update(data)
    count = conn.execute(
        sql.SQL("SELECT count(*) AS rows FROM {}").format(table_ident(table))
    ).fetchone()["rows"]
    return TableState(table, int(count), digest.hexdigest())


def preflight(source: psycopg.Connection, target: psycopg.Connection, tables: tuple[str, ...]) -> list[dict[str, Any]]:
    source_id = source.execute(
        "SELECT inet_server_addr()::text AS host, current_database() AS db"
    ).fetchone()
    target_id = target.execute(
        "SELECT inet_server_addr()::text AS host, current_database() AS db"
    ).fetchone()
    if source_id == target_id:
        raise RuntimeError("Source and target point at the SAME database")
    target_migrations = {
        row["name"] for row in target.execute(
            "SELECT name FROM public.proidu_schema_migrations"
        ).fetchall()
    }
    if not set(REQUIRED_MIGRATIONS).issubset(target_migrations):
        raise RuntimeError("Target missing expected migrations 0001-0004")
    report = []
    for table in tables:
        src, dest = get_columns(source, table), get_columns(target, table)
        if not src or not dest:
            raise RuntimeError(f"Missing table {table} in source or target")
        if [(r["column_name"], r["udt_schema"], r["udt_name"]) for r in src] != [
            (r["column_name"], r["udt_schema"], r["udt_name"]) for r in dest
        ]:
            raise RuntimeError(f"Schema mismatch in {table}: adjust 0001-0004 BEFORE export")
        if table == "institutions":
            pass
        order_source, order_target = get_order(source, table), get_order(target, table)
        if order_source != order_target:
            raise RuntimeError(f"Primary key mismatch in {table}")
        source_count = int(source.execute(
            sql.SQL("SELECT count(*) AS n FROM {}").format(table_ident(table))
        ).fetchone()["n"])
        target_count = int(target.execute(
            sql.SQL("SELECT count(*) AS n FROM {}").format(table_ident(table))
        ).fetchone()["n"])
        report.append({"table": table, "source_rows": source_count, "target_rows": target_count})
    return report


def copy_one(src: psycopg.Connection, dst: psycopg.Connection, name: str) -> TableState:
    fields = [c["column_name"] for c in get_columns(src, name)]
    keys = get_order(src, name)
    source_hash = hashlib.sha256()
    query = ordered_copy_query(name, fields, keys)
    into = sql.SQL("COPY {} ({}) FROM STDIN WITH (FORMAT CSV, NULL '\\N')").format(
        table_ident(name), sql.SQL(",").join(map(sql.Identifier, fields))
    )
    with src.cursor() as reader, dst.cursor() as writer:
        with reader.copy(query) as feed, writer.copy(into) as receive:
            while chunk := feed.read():
                source_hash.update(chunk)
                receive.write(chunk)

    source_state = read_checksums(src, name, fields, keys)
    target_state = read_checksums(dst, name, fields, keys)
    if source_state.rows != target_state.rows or source_state.checksum != target_state.checksum:
        raise RuntimeError(f"Data reconciliation failed on {name} (transaction rolled back)")
    if source_hash.hexdigest() != source_state.checksum:
        raise RuntimeError(f"Source changed within repeatable-read snapshot: {name}")
    return target_state


def synchronize_identity(conn: psycopg.Connection) -> None:
    conn.execute(
        """SELECT setval(
          pg_get_serial_sequence('public.platform_data_versions','id'),
          COALESCE((SELECT max(id) FROM public.platform_data_versions),1),
          EXISTS(SELECT 1 FROM public.platform_data_versions)
        )"""
    )


def run(mode: str, include_private: bool = False) -> dict[str, Any]:
    source_dsn = os.environ.get("PROIDU_SOURCE_DSN")
    target_dsn = os.environ.get("PROIDU_TARGET_DSN")
    if not source_dsn or not target_dsn:
        raise RuntimeError("PROIDU_SOURCE_DSN and PROIDU_TARGET_DSN must be set in secret environment")
    if mode == "apply" and os.getenv("PROIDU_ALLOW_STAGING_WRITE") != "YES":
        raise RuntimeError("Set PROIDU_ALLOW_STAGING_WRITE=YES for intentional target staging writes")
    tables = selected_tables(include_private)

    # Connections close on any error. Entire target change is one transaction.
    with psycopg.connect(source_dsn, row_factory=dict_row, autocommit=False) as source:
        with psycopg.connect(target_dsn, row_factory=dict_row, autocommit=False) as target:
            source.execute("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY")
            source.execute("SET LOCAL TIME ZONE 'UTC'")
            target.execute("SET LOCAL TIME ZONE 'UTC'")
            baseline = preflight(source, target, tables)
            if mode == "preflight":
                return {"mode": mode, "tables": baseline, "safe_to_apply": all(x["target_rows"] == 0 for x in baseline)}
            if mode == "apply" and any(row["target_rows"] > 0 for row in baseline):
                raise RuntimeError("Target NOT empty; refusing to overwrite, upsert or duplicate rows")
            states = []
            for row in baseline:
                name = row["table"]
                if mode == "apply":
                    state = copy_one(source, target, name)
                else:
                    fields = [c["column_name"] for c in get_columns(source, name)]
                    keys = get_order(source, name)
                    state = read_checksums(target, name, fields, keys)
                    current = read_checksums(source, name, fields, keys)
                    if (state.rows, state.checksum) != (current.rows, current.checksum):
                        raise RuntimeError(f"Source / staging mismatch: {name}")
                states.append({"table": state.name, "rows": state.rows, "sha256": state.checksum})
            if mode == "apply":
                synchronize_identity(target)
            else:
                target.rollback()
            return {"mode": mode, "tables": states, "verified": True, "private_tables_included": include_private}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("mode", choices=("preflight", "apply", "verify"))
    parser.add_argument(
        "--include-private", action="store_true",
        help="include applicant requests/payment intents after explicit review (default: excluded)",
    )
    args = parser.parse_args()
    if args.include_private:
        raise SystemExit(
            "Private payment/applicant migration is intentionally disabled until "
            "payment/auth/retention migration is independently approved."
        )
    report = run(args.mode, args.include_private)
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
