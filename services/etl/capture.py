"""Source -> isolated PROIDU staging, without mutating shared Supabase.
Read-only REPEATABLE READ source transaction. Operator-only target writes.
No secrets or actual records are logged.

CLI:
  SOURCE_DATABASE_URL=... DATABASE_URL=... \
    python -m services.etl.capture capture --expected-target-db proidu_staging
  DATABASE_URL=... python -m services.etl.capture verify --batch-id UUID \
    --expected-target-db proidu_staging
  DATABASE_URL=... python -m services.etl.capture promote --batch-id UUID \
    --expected-target-db proidu_staging --approval IMPORT_TO_STAGING_ONLY

A source-wide disaster-recovery backup AND independently tested restoration
are prerequisites for operator execution on real data, not provided here.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from collections import defaultdict
from uuid import uuid4

import psycopg
from psycopg import sql
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb

# Explicit allowlist. Shared GI/AF, auth, storage, private workspaces and
# unrelated AI factory workflow tables NEVER enter PROIDU staging.
SOURCE_TABLES = (
    "regions", "institutions", "sources", "programs", "admission_offers",
    "exam_sets", "exam_requirements", "cutoff_history",
    "individual_achievement_rules", "admission_deadlines", "required_documents",
    "ingestion_runs", "source_snapshots", "validation_issues",
    "institution_monitoring_metrics", "institution_ugs_groups",
    "ingestion_queue", "institution_source_registry", "factory_runs",
    "source_registry", "ingestion_jobs", "extraction_evidence",
    "coverage_snapshots",
    "platform_ingestion_jobs", "platform_data_versions",
    "platform_evidence_records", "platform_source_checkpoints",
)
PRIVATE_TABLES = ("payment_intents", "university_check_requests")
# Table order respects source FKs, except self-reference in institutions.
SENSITIVE_TABLES = frozenset(('payment_intents', 'university_check_requests'))
CAPTURE_TABLES = tuple(t for t in SOURCE_TABLES if t not in SENSITIVE_TABLES)

PROMOTE_TABLES = (
    "regions", "institutions", "sources", "programs", "admission_offers",
    "exam_sets", "exam_requirements", "cutoff_history",
    "individual_achievement_rules", "admission_deadlines",
    "required_documents", "ingestion_runs", "source_snapshots",
    "validation_issues",
)


def canonical_bytes(value: dict) -> bytes:
    return json.dumps(
        value, sort_keys=True, ensure_ascii=False,
        separators=(",", ":"), default=str,
    ).encode("utf-8")


def hash_row(value: dict) -> str:
    return hashlib.sha256(canonical_bytes(value)).hexdigest()


def table_digest(keys_and_hashes: list[tuple[str, str]]) -> str:
    sha = hashlib.sha256()
    for key, rowhash in sorted(keys_and_hashes):
        sha.update(key.encode("utf-8"))
        sha.update(b"\x00")
        sha.update(rowhash.encode("ascii"))
        sha.update(b"\n")
    return sha.hexdigest()


def checked_tables(value: str) -> tuple[str, ...]:
    names = tuple(item.strip() for item in value.split(",") if item.strip())
    if not names or len(names) != len(set(names)):
        raise ValueError("Choose nonempty, unique table names")
    if set(names) & SENSITIVE_TABLES:
        raise ValueError("Private applicant/payment tables require separate audited migration")
    if set(names) - set(SOURCE_TABLES):
        raise ValueError("Disallowed table name in source allowlist")
    return names


def primary_key_columns(conn: psycopg.Connection, table: str) -> tuple[str, ...]:
    rows = conn.execute(
        """SELECT a.attname FROM pg_index i
           JOIN pg_class t ON t.oid=i.indrelid
           JOIN pg_namespace n ON n.oid=t.relnamespace
           JOIN unnest(i.indkey) WITH ORDINALITY AS k(attnum,ord) ON true
           JOIN pg_attribute a ON a.attrelid=t.oid AND a.attnum=k.attnum
           WHERE n.nspname='public' AND t.relname=%s AND i.indisprimary
           ORDER BY k.ord""", (table,),
    ).fetchall()
    if not rows:
        raise RuntimeError(f"Missing primary key on source table: {table}")
    return tuple(row["attname"] for row in rows)


def source_key(record: dict, pk: tuple[str, ...]) -> str:
    if len(pk) == 1:
        value = record.get(pk[0])
        if value is None:
            raise ValueError(f"Missing primary key {pk[0]}")
        return str(value)
    values = [record.get(k) for k in pk]
    if any(value is None for value in values):
        raise ValueError("Null component of composite key")
    return json.dumps(values, separators=(",", ":"), ensure_ascii=False)


def check_target(conn: psycopg.Connection, expected: str) -> None:
    name = conn.execute("SELECT current_database() AS db").fetchone()["db"]
    if name != expected or not name.lower().startswith("proidu_stag"):
        raise RuntimeError("Target must be an explicitly named isolated proidu_staging* database")


def capture(source_url: str, target_url: str, target_name: str,
            tables: tuple[str, ...] = CAPTURE_TABLES) -> dict:
    batch_id = uuid4()
    with psycopg.connect(source_url, autocommit=True, row_factory=dict_row) as src, \
         psycopg.connect(target_url, autocommit=True, row_factory=dict_row) as dest:
        check_target(dest, target_name)
        if src.info.dbname == dest.info.dbname and src.info.host == dest.info.host:
            raise RuntimeError("Source and target may not be the same database")
        with src.transaction():
            src.execute("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY DEFERRABLE")
            snapshot = src.execute(
                "SELECT transaction_timestamp() AS captured, "
                "current_setting('server_version') AS pg_version"
            ).fetchone()
            counts = {}
            digests = {}
            with dest.transaction():
                dest.execute(
                    """INSERT INTO migration.extract_batches(
                      batch_id, source_ref, source_pg_version, source_snapshot)
                    VALUES(%s,'supabase-proidu',%s,%s)""",
                    (batch_id, snapshot["pg_version"], snapshot["captured"]),
                )
                for table in tables:
                    pk = primary_key_columns(src, table)
                    entries = []
                    # Server-side cursor: bounded memory despite long queues.
                    with src.cursor(name=f"proidu_export_{table}") as cur:
                        cur.execute(sql.SQL(
                            "SELECT to_jsonb(t) AS record FROM {} AS t ORDER BY {}"
                        ).format(
                            sql.Identifier("public", table),
                            sql.SQL(", ").join(sql.Identifier(x) for x in pk),
                        ))
                        while True:
                            rows = cur.fetchmany(250)
                            if not rows:
                                break
                            arguments = []
                            for row in rows:
                                record = row["record"]
                                key = source_key(record, pk)
                                digest = hash_row(record)
                                entries.append((key, digest))
                                arguments.append((
                                    batch_id, table, key, Jsonb(record), digest,
                                ))
                            with dest.cursor() as writer:
                                writer.executemany(
                                    """INSERT INTO migration.source_rows(
                                      batch_id,source_table,source_pk,payload,payload_sha256)
                                      VALUES(%s,%s,%s,%s,%s)""",
                                    arguments,
                                )
                    counts[table] = len(entries)
                    digests[table] = table_digest(entries)
                dest.execute(
                    """UPDATE migration.extract_batches SET status='completed',
                       finished_at=now(), table_counts=%s, table_digests=%s
                       WHERE batch_id=%s""",
                    (Jsonb(counts), Jsonb(digests), batch_id),
                )
    return {"batch_id": str(batch_id), "counts": counts,
            "digests": digests, "source_is_read_only": True}


def verify(conn: psycopg.Connection, batch_id: str) -> dict:
    batch = conn.execute(
        "SELECT status,table_counts,table_digests FROM migration.extract_batches WHERE batch_id=%s",
        (batch_id,),
    ).fetchone()
    if not batch or batch["status"] not in ("completed", "reconciled"):
        raise RuntimeError("Missing or unfinished staging batch")
    checks = {}
    for table, expected in batch["table_counts"].items():
        rows = conn.execute(
            """SELECT source_pk,payload_sha256 FROM migration.source_rows
               WHERE batch_id=%s AND source_table=%s ORDER BY source_pk""",
            (batch_id, table),
        ).fetchall()
        digest = table_digest([(x["source_pk"], x["payload_sha256"]) for x in rows])
        ok = len(rows) == expected and digest == batch["table_digests"][table]
        checks[table] = {"expected": expected, "staged": len(rows), "digest_match": ok}
        conn.execute(
            """INSERT INTO migration.reconciliations(
               batch_id,table_name,expected_rows,observed_rows,expected_digest,
               observed_digest,passed) VALUES(%s,%s,%s,%s,%s,%s,%s)""",
            (batch_id, table, expected, len(rows), batch["table_digests"][table],
             digest, ok),
        )
    if not all(x["digest_match"] for x in checks.values()):
        raise RuntimeError("Staging reconciliation failure")
    conn.execute(
        "UPDATE migration.extract_batches SET status='reconciled' WHERE batch_id=%s",
        (batch_id,),
    )
    return checks


def promote(conn: psycopg.Connection, batch_id: str) -> dict:
    batch = conn.execute(
        "SELECT status,table_counts FROM migration.extract_batches WHERE batch_id=%s",
        (batch_id,),
    ).fetchone()
    if not batch or batch["status"] != "reconciled":
        raise RuntimeError("Verify the staged batch before catalog promotion")
    promoted = {}
    for table in PROMOTE_TABLES:
        if table not in batch["table_counts"]:
            continue
        before = conn.execute(sql.SQL("SELECT count(*) AS count FROM {}").format(
            sql.Identifier("public", table),
        )).fetchone()["count"]
        if before:
            raise RuntimeError(f"Refusing nonempty target table {table}")
        payload = sql.SQL("s.payload - 'parent_id'") if table == "institutions" else sql.SQL("s.payload")
        query = sql.SQL("""
          INSERT INTO {} SELECT (jsonb_populate_record(NULL::{}, {})).*
          FROM migration.source_rows s
          WHERE s.batch_id=%s AND s.source_table=%s
          ORDER BY s.source_pk
        """).format(
            sql.Identifier("public", table),
            sql.Identifier("public", table),
            payload,
        )
        conn.execute(query, (batch_id, table))
        after = conn.execute(sql.SQL("SELECT count(*) AS count FROM {}").format(
            sql.Identifier("public", table),
        )).fetchone()["count"]
        if after != batch["table_counts"][table]:
            raise RuntimeError(f"Promoted row count mismatch: {table}")
        promoted[table] = after
    if "institutions" in promoted:
        conn.execute(
            """UPDATE public.institutions i SET parent_id=(s.payload->>'parent_id')::uuid
               FROM migration.source_rows s WHERE s.batch_id=%s
               AND s.source_table='institutions' AND s.source_pk=i.id::text
               AND nullif(s.payload->>'parent_id','') IS NOT NULL""",
            (batch_id,),
        )
    return promoted


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=("capture", "verify", "promote"))
    parser.add_argument("--batch-id")
    parser.add_argument("--expected-target-db", required=True)
    parser.add_argument("--tables", default=",".join(CAPTURE_TABLES))
    parser.add_argument("--approval", default="")
    args = parser.parse_args()
    target_url = os.environ["DATABASE_URL"]
    if args.command == "capture":
        result = capture(os.environ["SOURCE_DATABASE_URL"], target_url,
                         args.expected_target_db, checked_tables(args.tables))
    else:
        if not args.batch_id:
            parser.error("--batch-id is required")
        if args.command == "promote" and args.approval != "IMPORT_TO_STAGING_ONLY":
            parser.error("promote requires explicit --approval IMPORT_TO_STAGING_ONLY")
        with psycopg.connect(target_url, autocommit=True, row_factory=dict_row) as conn:
            check_target(conn, args.expected_target_db)
            with conn.transaction():
                result = (
                    verify(conn, args.batch_id)
                    if args.command == "verify" else promote(conn, args.batch_id)
                )
    print(json.dumps(result, sort_keys=True, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
