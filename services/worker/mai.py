"""PROIDU-MAI isolated ingestion worker (source: ai-platform-core/src/proidu-mai.ts).

This is a source-parity PORT of the pinned MAI HTML extraction rules,
not the migration of arbitrary AI Factory worker code or credentials.

In staging, writes only versioned candidates pending human verification.
Never writes admissions programs / verified records directly.
"""
from __future__ import annotations

import argparse
import hashlib
import html
import json
import os
import re
import sys
import time
from datetime import datetime, timezone
from html.parser import HTMLParser
from urllib.parse import urlparse

import httpx
import psycopg
from psycopg.rows import dict_row

MAI_URL = "https://priem.mai.ru/base/programs/"
MAI_SOURCE_ID = "proidu.mai.programs-2026"
MAX_BYTES = 3_000_000
YEAR = 2026

SUBJECT_ABBREVIATIONS = {
    "M": "Математика",
    "И/Ф": "Информатика или физика",
    "Ф": "Физика",
    "Г": "География",
    "M/Б": "Математика или биология",
    "M/И": "Математика или информатика",
    "Р": "Русский язык",
}

PAIR = re.compile(r"^\s*([\d\s]+|[-–—])\s*/\s*([\d\s]+|[-–—])\s*$")
CODE = re.compile(r"^\d{2}\.\d{2}\.\d{2}$")
CITY = re.compile(r"Москва|Жуковский|Ступино")
FORM = re.compile(r"Очно-заоч\.?|Заоч\.?|Очная")


class _MaiSections(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.sections: list[tuple[str, list[str]]] = []
        self.heading: list[str] | None = None
        self.active: list[str] = []
        self.title = ""
        self.parts: list[str] = []

    def handle_starttag(self, tag, attrs):
        if tag == "h3":
            if self.title or self.parts:
                self._finish()
            self.heading = []
        if tag == "br":
            self.active.append("\n")

    def handle_endtag(self, tag):
        if tag == "h3" and self.heading is not None:
            self.title = " ".join(" ".join(self.heading).split())
            self.heading = None
        elif tag in ("p", "div", "li", "tr", "section", "h1", "h2"):
            self.active.append("\n")

    def handle_data(self, data):
        if self.heading is not None:
            self.heading.append(data)
        elif self.title:
            self.active.append(data)

    def _finish(self):
        self.parts = [v.strip() for v in re.split(r"\n+", "".join(self.active)) if v.strip()]
        if self.title:
            self.sections.append((self.title, self.parts))
        self.active = []
        self.title = ""
        self.parts = []

    def close(self):
        super().close()
        self._finish()


def fetch_mai_html(url: str = MAI_URL, fetcher=None) -> str:
    """Exact-host HTTPS allowlist, no redirects, bounded bytes and attempts."""
    parsed = urlparse(url)
    if parsed.scheme != "https" or parsed.hostname != "priem.mai.ru" or parsed.port not in (None, 443):
        raise ValueError("Only official HTTPS MAI host is permitted")
    if parsed.username or parsed.password or parsed.fragment or url != MAI_URL:
        raise ValueError("Only pre-approved MAI source URL is permitted")
    if fetcher is not None:
        response = fetcher(url)
        if isinstance(response, str):
            if len(response.encode("utf-8")) > MAX_BYTES:
                raise ValueError("Source response is too large")
            return response
        raise ValueError("Test fetcher must return HTML string")
    last_error = None
    for attempt in range(3):
        try:
            with httpx.Client(timeout=15, follow_redirects=False) as client:
                with client.stream(
                    "GET", url,
                    headers={"Accept": "text/html,application/xhtml+xml", "User-Agent": "PROIDU-MAI/4.0"}
                ) as response:
                    if 300 <= response.status_code < 400:
                        raise ValueError("Official source returned redirect")
                    response.raise_for_status()
                    if "text/html" not in response.headers.get("content-type", "").lower():
                        raise ValueError("Official source is not HTML")
                    body = bytearray()
                    for chunk in response.iter_bytes():
                        body.extend(chunk)
                        if len(body) > MAX_BYTES:
                            raise ValueError("Source exceeds 3 MB limit")
                    return body.decode("utf-8")
        except (httpx.HTTPError, UnicodeDecodeError) as error:
            last_error = error
            if attempt < 2:
                time.sleep(0.5 * (2 ** attempt))
    raise RuntimeError("Official source fetch failed") from last_error


def _pair(raw: str) -> tuple[int | None, int | None] | None:
    matched = PAIR.fullmatch(raw)
    if not matched:
        return None
    def one(s: str):
        s = s.replace(" ", "").strip()
        return None if s in ("-", "–", "—") else int(s)
    return one(matched[1]), one(matched[2])


def parse_mai_html(content: str) -> tuple[list[dict], list[dict]]:
    parser = _MaiSections()
    parser.feed(content)
    parser.close()
    records: list[dict] = []
    quarantine: list[dict] = []
    for title, lines in parser.sections:
        idx = next((i for i, s in enumerate(lines) if CODE.fullmatch(s)), -1)
        if idx < 0:
            continue
        code = lines[idx]
        descriptor = lines[idx + 1] if len(lines) > idx + 1 else ""
        city = CITY.search(descriptor)
        form = FORM.search(descriptor)
        values = [v for s in lines[idx + 2:] if (v := _pair(s)) is not None]
        if not title or not city or not form or len(values) < 2:
            quarantine.append({
                "title": title,
                "code": code,
                "reason": "Required MAI admission fields missing",
            })
            continue
        prefix = descriptor[:city.start()]
        exams = [SUBJECT_ABBREVIATIONS.get(t, t) for t in prefix.split()]
        if not exams:
            quarantine.append({"title": title, "code": code, "reason": "Exam subjects missing"})
            continue
        record = {
            "institution": "Московский авиационный институт",
            "admissionYear": YEAR,
            "title": title,
            "code": code,
            "exams": exams,
            "city": city.group(),
            "studyForm": form.group(),
            "budgetSeats": values[0][0],
            "paidSeats": values[0][1],
            "budgetPassingScore": values[1][0],
            "paidPassingScore": values[1][1],
            "sourceUrl": MAI_URL,
        }
        records.append(record)
    return records, quarantine


def _sha256(record: dict) -> str:
    return hashlib.sha256(
        json.dumps(record, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
    ).hexdigest()


def stage_mai_candidate_records(conn: psycopg.Connection, html_text: str, now: datetime) -> dict:
    records, errors = parse_mai_html(html_text)
    digest = hashlib.sha256(html_text.encode("utf-8")).hexdigest()
    block = (now.hour // 6) * 6
    window = now.replace(hour=block, minute=0, second=0, microsecond=0)
    job_key = "mai:2026:" + window.isoformat()
    job = conn.execute(
        """INSERT INTO public.proidu_worker_jobs
         (job_key,product,source_url,source_id,admission_year,status,attempts)
         VALUES (%s,'proidu',%s,%s,%s,'running',1)
         ON CONFLICT (job_key) DO NOTHING RETURNING id""",
        (job_key, MAI_URL, MAI_SOURCE_ID, YEAR)
    ).fetchone()
    if job is None:
        return {"status": "duplicate", "count": 0, "quarantined": 0}
    job_id = job["id"]
    for item in records:
        conn.execute(
            """INSERT INTO public.proidu_source_candidates
             (job_id,source_id,source_url,admission_year,entity_type,entity_key,
              content,content_sha256,evidence,review_status)
             VALUES (%s,%s,%s,%s,'admission-program',%s,%s,%s,%s,'pending_review')
             ON CONFLICT (source_id,entity_type,entity_key,content_sha256) DO NOTHING""",
            (job_id, MAI_SOURCE_ID, MAI_URL, YEAR,
             item["code"] + ":" + item["city"] + ":" + item["studyForm"], json.dumps(item, ensure_ascii=False),
             _sha256(item), json.dumps([{"source_url": MAI_URL, "snapshot_sha256": digest,
             "captured_at": now.isoformat(), "status": "source_observed"}]))
        )
    for i, item in enumerate(errors):
        conn.execute(
            """INSERT INTO public.proidu_source_candidates
             (job_id,source_id,source_url,admission_year,entity_type,entity_key,
              content,content_sha256,evidence,review_status,quarantine_reason)
             VALUES (%s,%s,%s,%s,'admission-program',%s,%s,%s,'[]','quarantined',%s)
             ON CONFLICT (source_id,entity_type,entity_key,content_sha256) DO NOTHING""",
            (job_id, MAI_SOURCE_ID, MAI_URL, YEAR,
             "quarantine:" + str(i) + ":" + item["code"],
             json.dumps(item, ensure_ascii=False), _sha256(item), item["reason"])
        )
    conn.execute(
        """UPDATE public.proidu_worker_jobs
         SET status=%s, result_summary=%s,updated_at=now() WHERE id=%s""",
        ("quarantined" if errors and not records else "succeeded",
         json.dumps({"parsed": len(records), "quarantined": len(errors),
                     "snapshot_sha256": digest}), job_id)
    )
    return {"status": "staged_for_review", "count": len(records), "quarantined": len(errors),
            "source_sha256": digest}


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--once", action="store_true", help="fetch MAI once, stage candidates only")
    args = parser.parse_args(argv)
    if not args.once:
        parser.error("only --once supported; no unapproved continuous crawling")
    if os.getenv("PROIDU_ENABLE_WORKERS") != "YES":
        parser.error("staging worker disabled: set PROIDU_ENABLE_WORKERS=YES on private worker host")
    dsn = os.environ["PROIDU_WORKER_DATABASE_URL"]
    html_text = fetch_mai_html()
    with psycopg.connect(dsn, row_factory=dict_row) as conn:
        result = stage_mai_candidate_records(conn, html_text, datetime.now(timezone.utc))
    print(json.dumps(result, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
