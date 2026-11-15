"""Independent public admissions API. No Supabase/Vercel runtime.
All private applicant, payment and admin APIs remain intentionally unimplemented.
"""
from __future__ import annotations
from base64 import urlsafe_b64encode, urlsafe_b64decode
from collections import Counter
from datetime import datetime, timezone
from uuid import UUID
import os

from fastapi import Body, Depends, FastAPI, HTTPException
from psycopg import Connection

from .database import get_connection, lifespan
from .factory_bridge import router as factory_bridge_router
from .queries import PROGRAM_SELECT, SEARCH_FILTER, SELECT_IDS
from .rules import SUBJECTS, normalized_scores, score_band, score_program

app = FastAPI(title="PROIDU Admissions API", version="4.0.0-alpha", lifespan=lifespan)
app.include_router(factory_bridge_router)

MAX_SEARCH_PAGE = 200
MAX_SCAN = 10000
MAX_SELECTED = 50


def bounded_int(value, default: int, low: int, high: int) -> int:
    try:
        number = int(value)
    except (ValueError, TypeError, OverflowError):
        return default
    return max(low, min(high, number))


def search_terms(body: dict, key: str) -> tuple[str, str]:
    value = str(body.get(key) or "").strip()[:100]
    return value, "%" + value + "%"


def read_cursor(token: str | None) -> tuple[str, int]:
    if not token:
        return "00000000-0000-0000-0000-000000000000", -1
    try:
        raw = urlsafe_b64decode(token + "=" * (-len(token) % 4)).decode("ascii")
        uid, variant = raw.split(":")
        UUID(uid)
        n = int(variant)
        if not 0 <= n <= 1000:
            raise ValueError("variant")
        return uid, n
    except (ValueError, UnicodeError, TypeError):
        raise HTTPException(status_code=422, detail="Invalid pagination cursor") from None


def make_cursor(row: dict) -> str:
    raw = f"{row['program_id']}:{row['exam_variant']}".encode("ascii")
    return urlsafe_b64encode(raw).decode("ascii").rstrip("=")


def scoring_row(row: dict, scores: dict[str, int], *, gap: int) -> dict | None:
    result = dict(row)
    result.pop("exam_variant", None)
    reqs = result.get("exam_requirements") or []
    if scores:
        eligible, score = score_program(reqs, scores)
        if not eligible:
            return None
    else:
        score = None
    result["user_score"] = score
    fit, score_gap = score_band(score, result.get("cutoff_score"), gap)
    result["score_fit"] = fit
    result["score_gap"] = score_gap
    return result


def _search_programs(body: dict, conn: Connection) -> dict:
    year = bounded_int(body.get("year"), 2026, 2020, 2100)
    gap = bounded_int(body.get("ambitiousGap"), 20, 0, 100)
    page_size = bounded_int(body.get("limit"), 100, 1, MAX_SEARCH_PAGE)
    score_mode = body.get("scoreMode") if body.get("scoreMode") in ("route", "reachable", "all") else "route"
    scores = normalized_scores(body.get("scores"))
    if body.get("scores") and not scores:
        raise HTTPException(422, "Invalid exam scores")
    query, query_like = search_terms(body, "query")
    region, region_like = search_terms(body, "region")
    budget_only = body.get("budgetOnly", True) not in (False, "false")
    last_id, last_variant = read_cursor(body.get("cursor"))
    scanned = 0
    found: list[dict] = []
    seen: set[str] = set()
    next_cursor = None
    exhausted = False
    # Keyset batching: never silently truncate search to 500 rows before scoring.
    while scanned < MAX_SCAN and len(found) < page_size:
        batch_size = min(250, MAX_SCAN - scanned)
        parameters = [
            year, query, query_like, query_like, query_like, query_like,
            region, region_like, region_like, region_like,
            budget_only, last_id, last_id, last_variant, batch_size,
        ]
        rows = conn.execute(PROGRAM_SELECT + SEARCH_FILTER + " LIMIT %s", parameters).fetchall()
        if not rows:
            exhausted = True
            break
        for row in rows:
            scanned += 1
            last_id, last_variant = row["program_id"], row["exam_variant"]
            next_cursor = make_cursor(row)
            candidate = scoring_row(row, scores, gap=gap)
            if candidate is None:
                continue
            if score_mode == "reachable" and (candidate["score_gap"] is None or candidate["score_gap"] < 0):
                continue
            if score_mode == "route" and candidate["score_fit"] in ("below", "not_requested"):
                # Without scores, show compatible catalogue rows as unranked entries.
                if scores:
                    continue
            if candidate["program_id"] not in seen:
                found.append(candidate)
                seen.add(candidate["program_id"])
            if len(found) >= page_size:
                break
        if len(rows) < batch_size:
            exhausted = True
            break
    if exhausted:
        next_cursor = None
    found.sort(key=lambda x: (
        {"safe": 0, "realistic": 1, "ambitious": 2, "no_history": 3, "not_requested": 4, "below": 5}.get(x["score_fit"], 6),
        abs(x["score_gap"]) if x["score_gap"] is not None else 9999,
        x["institution_name"], x["code"],
    ))
    return {"data": found, "meta": {
        "count": len(found), "admission_year": year, "scanned": scanned,
        "next_cursor": next_cursor, "limited_by_scan": scanned >= MAX_SCAN and not exhausted,
        "ranking_scope": "page_only",
        "note": "Исторические проходные баллы не гарантируют зачисление.",
    }}


def _coverage(conn: Connection, year: int) -> dict:
    row = conn.execute(
        """SELECT
        (SELECT count(*) FROM public.regions WHERE published) AS regions_count,
        (SELECT count(*) FROM public.institutions WHERE published) AS institutions_count,
        (SELECT count(*) FROM public.programs WHERE published) AS programs_count,
        (SELECT count(*) FROM public.programs WHERE published AND verification_status='verified'
            AND admission_year=%s) AS verified_programs_count,
        (SELECT count(*) FROM public.admission_offers WHERE published AND admission_year=%s) AS offers_count,
        (SELECT count(*) FROM public.cutoff_history WHERE year=%s AND verification_status='verified') AS cutoff_count,
        now() AS updated_at""",
        (year, year, year - 1),
    ).fetchone()
    # Keep frontend v0.3 keys while annualizing the data.
    row["offers_2026_count"] = row["offers_count"] if year == 2026 else 0
    row["cutoff_2025_count"] = row["cutoff_count"] if year == 2026 else 0
    row["coverage_year"] = year
    return {"data": row}


def _institutions(body: dict, conn: Connection) -> dict:
    query, pattern = search_terms(body, "query")
    region, rp = search_terms(body, "region")
    limit = bounded_int(body.get("limit"), 100, 1, 500)
    records = conn.execute(
        """SELECT i.id::text AS institution_id,i.official_name,i.short_name,i.city,
               i.is_branch,i.parent_id::text,i.coverage_status,i.official_site,
               r.name AS region_name
           FROM public.institutions i LEFT JOIN public.regions r ON r.id=i.region_id
           WHERE i.published AND (%s='' OR i.official_name ILIKE %s OR i.city ILIKE %s)
             AND (%s='' OR r.name ILIKE %s OR i.city ILIKE %s)
           ORDER BY i.official_name, i.id LIMIT %s""",
        (query, pattern, pattern, region, rp, rp, limit),
    ).fetchall()
    return {"data": records, "meta": {"count": len(records), "max_page": limit}}


def _spo_routes(body: dict, conn: Connection) -> dict:
    year = bounded_int(body.get("year"), 2026, 2020, 2100)
    spo_code = str(body.get("spoCode") or "").strip()[:32]
    if not spo_code:
        raise HTTPException(422, "spoCode is required")
    query, qp = search_terms(body, "query")
    region, rp = search_terms(body, "region")
    # Fail closed: a program without an independent verified rules source is not eligible.
    rows = conn.execute(
        """SELECT p.id::text AS program_id,p.code,p.title,p.profile_title,
            i.id::text AS institution_id,i.official_name AS institution_name,
            i.short_name AS institution_short_name,i.city,r.name AS region_name,
            sr.route_type,sr.profile_match,sr.internal_exams,
            src.url AS source_url,ao.budget_places,'verified' AS verification_status
          FROM public.spo_admission_rules sr
          JOIN public.programs p ON p.id=sr.program_id AND p.admission_year=sr.admission_year
          JOIN public.institutions i ON i.id=p.institution_id
          JOIN public.spo_specialties sp ON sp.code=sr.spo_code
          JOIN public.sources src ON src.id=sr.source_id
          LEFT JOIN public.regions r ON r.id=i.region_id
          LEFT JOIN public.admission_offers ao ON ao.program_id=p.id AND ao.admission_year=p.admission_year
          WHERE sr.admission_year=%s AND sr.spo_code=%s
          AND sr.verification_status='verified' AND src.status='verified'
          AND sr.route_type='profile_internal' AND sr.profile_match
          AND p.verification_status='verified' AND p.published AND i.published
          AND (sr.effective_from IS NULL OR sr.effective_from<=CURRENT_DATE)
          AND (sr.effective_to IS NULL OR sr.effective_to>=CURRENT_DATE)
          AND (%s='' OR p.title ILIKE %s OR p.code ILIKE %s OR i.official_name ILIKE %s)
          AND (%s='' OR r.name ILIKE %s OR i.city ILIKE %s)
          ORDER BY i.official_name,p.code,p.id LIMIT %s""",
        (year, spo_code, query, qp, qp, qp, region, rp, rp, bounded_int(body.get("limit"), 100, 1, 200)),
    ).fetchall()
    return {"data": rows, "meta": {
        "count": len(rows), "year": year,
        "fallback": "ege" if not rows else None,
        "warning": None if rows else (
            "Нет подтверждённых правил профильного поступления по этому СПО. "
            "Проверяйте ЕГЭ и официальные правила выбранного вуза; поступление без ЕГЭ не подтверждено."
        ),
    }}


def _route(body: dict, conn: Connection) -> dict:
    raw_ids = body.get("programIds")
    if not isinstance(raw_ids, list) or not raw_ids or len(raw_ids) > MAX_SELECTED:
        raise HTTPException(422, "Select 1-50 program IDs")
    try:
        ids = list(dict.fromkeys(str(UUID(str(i))) for i in raw_ids))
    except (ValueError, TypeError, AttributeError):
        raise HTTPException(422, "Invalid program ID") from None
    scores = normalized_scores(body.get("scores"))
    if not scores:
        raise HTTPException(422, "Individual exam scores required for ЕГЭ route")
    year = bounded_int(body.get("year"), 2026, 2020, 2100)
    rows = conn.execute(PROGRAM_SELECT + SELECT_IDS, (year, ids)).fetchall()
    best: dict[str, dict] = {}
    for row in rows:
        scored = scoring_row(row, scores, gap=20)
        if scored is None:
            continue
        key = scored["program_id"]
        if key not in best or (scored["user_score"] or 0) > (best[key]["user_score"] or 0):
            best[key] = scored
    if not best:
        raise HTTPException(422, "Selected programs are absent or incompatible with verified EGE inputs")
    institution_ids = list({p["institution_id"] for p in best.values()})
    achievements = body.get("achievements") or {}
    requested = set()
    if achievements.get("honors") is True:
        requested.add("honors")
    if achievements.get("volunteer") is True:
        requested.add("volunteer")
    gto = achievements.get("gtoLevel")
    if gto in ("gold", "silver", "bronze"):
        requested.add("gto_" + gto)
    arows = conn.execute(
        """SELECT a.institution_id::text AS institution_id,a.achievement_type,a.title,a.points,
                  s.url AS source_url FROM public.individual_achievement_rules a
           LEFT JOIN public.sources s ON s.id=a.source_id
           WHERE a.institution_id=ANY(%s::uuid[]) AND a.admission_year=%s
             AND a.verification_status='verified'""",
        (institution_ids, year),
    ).fetchall()
    drows = conn.execute(
        """SELECT institution_id::text,event_type,event_at,description,source_url,verification_status
           FROM public.admission_deadlines WHERE institution_id=ANY(%s::uuid[])
           AND admission_year=%s AND verification_status='verified' ORDER BY event_at""",
        (institution_ids, year),
    ).fetchall()
    docs = conn.execute(
        """SELECT institution_id::text,document_code,label,conditions,source_url,verification_status
           FROM public.required_documents WHERE institution_id=ANY(%s::uuid[])
           AND admission_year=%s AND applicant_category='general'
           AND verification_status='verified' ORDER BY label""",
        (institution_ids, year),
    ).fetchall()
    enriched = []
    warnings: set[str] = set()
    for p in best.values():
        inst = p["institution_id"]
        rules = [
            {"type": r["achievement_type"], "title": r["title"], "points": r["points"],
             "source_url": r["source_url"]}
            for r in arows if r["institution_id"] == inst and r["achievement_type"] in requested
        ]
        points = min(10, sum(int(x["points"]) for x in rules))
        total = p["user_score"] + points
        band, gap = score_band(total, p.get("cutoff_score"))
        item = {
            **p, "id_points": points, "id_breakdown": rules, "effective_score": total,
            "route_score_fit": band, "route_score_gap": gap,
            "deadlines": [dict(d) for d in drows if d["institution_id"] == inst],
            "documents": [dict(d) for d in docs if d["institution_id"] == inst],
        }
        if p.get("cutoff_score") is None:
            warnings.add(p["institution_name"] + ": нет подтверждённого проходного ориентира.")
        if not item["deadlines"]:
            warnings.add(p["institution_name"] + ": нет проверенных сроков текущей кампании.")
        if not item["documents"]:
            warnings.add(p["institution_name"] + ": нет проверенного списка документов.")
        enriched.append(item)
    ranks = {"safe": 0, "realistic": 1, "ambitious": 2, "no_history": 3, "below": 4}
    enriched.sort(key=lambda p: (ranks.get(p["route_score_fit"], 9), -(p["effective_score"] or 0), p["program_id"]))
    output: list[dict] = []
    per_inst: Counter = Counter()
    used_cities: set[str] = set()
    for item in enriched:
        if per_inst[item["institution_id"]] == 0 and item["city"] not in used_cities:
            output.append(item)
            per_inst[item["institution_id"]] += 1
            if item["city"]:
                used_cities.add(item["city"])
            if len(output) >= 10:
                break
    for item in enriched:
        if len(output) >= 10:
            break
        if item not in output and per_inst[item["institution_id"]] < 2:
            output.append(item)
            per_inst[item["institution_id"]] += 1
    for idx, item in enumerate(output):
        item["priority"] = idx + 1
    categories = Counter(p["route_score_fit"] for p in output)
    return {"data": {
        "items": output,
        "diversification": {
            "institutions": len({p["institution_id"] for p in output}),
            "cities": len({p["city"] for p in output if p["city"]}),
            "categories": dict(categories),
        },
        "warnings": sorted(warnings | (
            {"Часть выбранных программ исключена из-за отсутствия/несовместимости: "
             + str(len(ids) - len(best))} if len(best) < len(ids) else set()
        )),
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "disclaimer": "Исторические баллы являются ориентиром, а не гарантией поступления. "
                      "Приоритеты рассчитаны для демонстрационного маршрута и требуют выбора абитуриента.",
    }}


@app.get("/healthz")
def health():
    return {"status": "ok", "service": "proidu-api", "version": "4.0.0-alpha"}


@app.get("/readyz")
def readiness(conn: Connection = Depends(get_connection)):
    conn.execute("SELECT 1").fetchone()
    return {"status": "ready"}


@app.post("/api/v1/search")
def search(body: dict = Body(default_factory=dict), conn: Connection = Depends(get_connection)):
    action = body.get("action", "programs")
    if action == "programs":
        return _search_programs(body, conn)
    if action == "coverage":
        return _coverage(conn, bounded_int(body.get("year"), 2026, 2020, 2100))
    if action == "institutions":
        return _institutions(body, conn)
    if action == "spo_routes":
        return _spo_routes(body, conn)
    raise HTTPException(400, "Unsupported search action")


@app.post("/api/v1/route")
def route(body: dict = Body(default_factory=dict), conn: Connection = Depends(get_connection)):
    return _route(body, conn)


@app.post("/api/v1/spo/routes")
def spo_routes(body: dict = Body(default_factory=dict), conn: Connection = Depends(get_connection)):
    return _spo_routes(body, conn)
