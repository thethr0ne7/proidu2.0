"""PROIDU staging ingestion worker; source provenance and human verification gate.

- Fetches only registered/active official HTTPS sources.
- MAI parser handles captured 2026 format ONLY.
- Global is an isolated queue: no claims from unknown laws or scraping bypass.
- Without independent raw S3 snapshot preservation, all candidates quarantine.
- Never grants a 'verified' status automatically.
"""
from __future__ import annotations

from hashlib import sha256
from html import unescape
from urllib.parse import urlparse
from urllib.request import Request, build_opener, HTTPRedirectHandler
import json
import os
import socket
import ssl
import time

import psycopg
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb

from .mai import OFFICIAL_URL, official_url, parse_mai


class RedirectDeny(HTTPRedirectHandler):
    def redirect_request(self, request, fp, code, msg, headers, newurl):
        raise RuntimeError("redirect_forbidden")


def fetch_official_html(url: str, *, max_bytes: int = 3_000_000, timeout: float = 15) -> bytes:
    """No redirects. Only explicitly implemented official-source adapter."""
    if not official_url(url):
        raise RuntimeError("source_not_allowed")
    request = Request(
        url,
        headers={"User-Agent": "PROIDU-Collector/4.0 (+https://github.com/thethr0ne7/proidu2.0)",
                 "Accept": "text/html,application/xhtml+xml"},
    )
    opener = build_opener(RedirectDeny())
    with opener.open(request, timeout=timeout) as response:
        kind = response.headers.get("Content-Type", "").lower()
        if "text/html" not in kind:
            raise RuntimeError("unsupported_content_type")
        if response.headers.get("Content-Length") and int(response.headers["Content-Length"]) > max_bytes:
            raise RuntimeError("response_too_large")
        payload = response.read(max_bytes + 1)
        if len(payload) > max_bytes:
            raise RuntimeError("response_too_large")
        return payload


def claim_one(conn: psycopg.Connection) -> dict | None:
    with conn.transaction():
        return conn.execute(
            """WITH candidate AS (
                 SELECT j.id FROM collector.jobs j
                 JOIN collector.sources s ON s.id=j.source_id
                 WHERE j.state='queued' AND s.status='active'
                   AND j.next_attempt_at<=now()
                 ORDER BY j.created_at, j.id
                 LIMIT 1 FOR UPDATE OF j SKIP LOCKED
               )
               UPDATE collector.jobs j SET state='running',
                 retry_count=retry_count+1, locked_at=now(), started_at=now()
               FROM candidate WHERE candidate.id=j.id
               RETURNING j.id,j.source_id,j.retry_count,j.idempotency_key""",
        ).fetchone()


def handle_once(conn: psycopg.Connection, *, fetcher=fetch_official_html,
                archive=None) -> dict:
    job = claim_one(conn)
    if not job:
        return {"status": "idle"}
    source = conn.execute(
        """SELECT id,source_key,track,country_iso2,admission_year,official_url,parser_key
           FROM collector.sources WHERE id=%s""", (job["source_id"],)
    ).fetchone()
    try:
        if source["track"] != "russia" or source["parser_key"] != "mai_2026":
            raise RuntimeError("parser_not_verified_for_track")
        if source["admission_year"] != 2026 or source["country_iso2"] != "RU":
            raise RuntimeError("wrong_mai_campaign")
        if not official_url(source["official_url"]):
            raise RuntimeError("unapproved_mai_url")

        raw = fetcher(source["official_url"])
        if not isinstance(raw, bytes) or not raw:
            raise RuntimeError("empty_or_invalid_source")
        if len(raw) > 3_000_000:
            raise RuntimeError("response_too_large")
        digest = sha256(raw).hexdigest()
        parsed, quarantined = parse_mai(raw.decode("utf-8", errors="replace"))
        archive_key = archive(source, raw, digest) if archive else None
        if archive_key is not None and not isinstance(archive_key, str):
            raise RuntimeError("invalid_archive_response")
        with conn.transaction():
            snap = conn.execute(
                """INSERT INTO collector.snapshots(
                   source_id,content_sha256,url,storage_key,content_bytes,http_status,content_type)
                   VALUES(%s,%s,%s,%s,%s,200,'text/html')
                   ON CONFLICT(source_id,content_sha256)
                   DO UPDATE SET fetched_at=EXCLUDED.fetched_at
                   RETURNING id""",
                (source["id"], digest, source["official_url"], archive_key, len(raw)),
            ).fetchone()
            for item in parsed:
                data = {
                    "institution": item.institution, "admissionYear": item.admissionYear,
                    "title": item.title, "code": item.code, "exams": item.exams,
                    "city": item.city, "studyForm": item.studyForm,
                    "budgetSeats": item.budgetSeats, "paidSeats": item.paidSeats,
                    "budgetPassingScore": item.budgetPassingScore,
                    "paidPassingScore": item.paidPassingScore,
                    "sourceUrl": item.sourceUrl,
                }
                # No archival bytes = no claim of persistent reproducible evidence.
                status = "review" if archive_key else "quarantine"
                reason = None if archive_key else "raw_evidence_not_archived"
                conn.execute(
                    """INSERT INTO collector.candidates(
                       source_id,snapshot_id,source_record_key,payload,
                       payload_sha256,validation_state,reason,evidence_url,admission_year)
                       VALUES(%s,%s,%s,%s,%s,%s,%s,%s,2026)
                       ON CONFLICT(source_id,source_record_key,payload_sha256) DO NOTHING""",
                    (source["id"], snap["id"], item.code + ":" + item.title,
                     Jsonb(data), item.content_sha256, status, reason, item.sourceUrl),
                )
            conn.execute(
                """UPDATE collector.sources SET last_hash=%s,last_checked_at=now(),
                   published_count=0 WHERE id=%s""", (digest, source["id"]),
            )
            conn.execute(
                """UPDATE collector.jobs SET state=%s,completed_at=now(),
                   result_summary=%s WHERE id=%s""",
                ("quarantine" if quarantined or not archive_key else "succeeded",
                 Jsonb({"parsed": len(parsed), "quarantined": len(quarantined),
                        "raw_archived": bool(archive_key),
                        "promoted_to_verified": 0}), job["id"]),
            )
        return {"status": "quarantine" if quarantined or not archive_key else "review",
                "parsed": len(parsed), "quarantined": len(quarantined), "promoted": 0}
    except Exception as exc:
        # Never log HTML/response bodies, SQL DSNs or applicant records.
        error_code = str(exc)[:100] if str(exc).isidentifier() else type(exc).__name__
        with conn.transaction():
            conn.execute(
                """UPDATE collector.jobs SET
                   state=CASE WHEN retry_count>=3 THEN 'failed' ELSE 'queued' END,
                   next_attempt_at=now() + (power(2,retry_count)::int * interval '1 minute'),
                   error_code=%s,completed_at=now() WHERE id=%s""",
                (error_code, job["id"]),
            )
        return {"status": "error", "code": error_code}


def run() -> None:
    # Disabled by default in Timeweb staging until source review + archive + role setup.
    enabled = os.getenv("PROIDU_COLLECTOR_ENABLED", "false").lower() == "true"
    once = os.getenv("PROIDU_COLLECTOR_ONCE", "true").lower() == "true"
    delay = min(3600, max(15, int(os.getenv("PROIDU_COLLECTOR_INTERVAL_SECONDS", "120"))))
    if not enabled:
        print(json.dumps({"status":"disabled","message":"PROIDU collector opt-in required"}))
        return
    with psycopg.connect(os.environ["DATABASE_URL"], autocommit=True, row_factory=dict_row) as conn:
        while True:
            print(json.dumps(handle_once(conn), ensure_ascii=False))
            if once:
                break
            time.sleep(delay)


if __name__ == "__main__":
    run()
