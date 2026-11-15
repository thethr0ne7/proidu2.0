"""Independent AI Factory intake gateway, separate from public admissions API.
Server-to-server HMAC, strict timestamp/replay nonce, bounded payload.
All incoming facts stay in PENDING REVIEW; no automatic verification.
"""
from __future__ import annotations

import hashlib
import hmac
import json
import os
import re
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb
from psycopg_pool import ConnectionPool

NONCE_RE = re.compile(r"^[A-Za-z0-9_-]{16,128}$")
EVENT_OPERATIONS = {
    "source.research.proposed": "extract_official",
    "source.evidence.proposed": "validate_evidence",
    "quality.review.requested": "validate_evidence",
}
MAX_BYTES = 32768
MAX_SKEW = 300


def sign(secret: str, timestamp: str, nonce: str, raw: bytes) -> str:
    data = timestamp.encode("ascii") + b"\n" + nonce.encode("ascii") + b"\n" + raw
    return "sha256=" + hmac.new(secret.encode("utf-8"), data, hashlib.sha256).hexdigest()


def verify_hmac(secret: str, timestamp: str, nonce: str,
                signature: str, raw: bytes, *, now: int | None = None) -> bool:
    if len(secret) < 32 or len(raw) > MAX_BYTES or not NONCE_RE.fullmatch(nonce):
        return False
    try:
        seconds = int(timestamp)
        if str(seconds) != timestamp or abs((now if now is not None else int(time.time())) - seconds) > MAX_SKEW:
            return False
    except (ValueError, TypeError):
        return False
    return hmac.compare_digest(sign(secret, timestamp, nonce, raw), signature)


@asynccontextmanager
async def lifespan(app: FastAPI):
    dsn = os.getenv("AI_BRIDGE_DATABASE_URL")
    app.state.pool = None
    if dsn:
        pool = ConnectionPool(
            conninfo=dsn, min_size=1, max_size=3, open=False, timeout=5,
            kwargs={"row_factory": dict_row, "autocommit": True},
        )
        pool.open(wait=True)
        app.state.pool = pool
    try:
        yield
    finally:
        if app.state.pool:
            app.state.pool.close()


app = FastAPI(title="PROIDU Factory Intake",version="4.0.0-alpha",lifespan=lifespan)


@app.get("/healthz")
def healthz():
    return {"service": "factory-intake", "status": "ok"}


@app.post("/v1/factory/events", status_code=202)
async def receive_event(request: Request):
    secret = os.getenv("AI_FACTORY_SHARED_SECRET", "")
    if len(secret) < 32:
        raise HTTPException(503, "Factory integration is disabled")
    raw = await request.body()
    timestamp = request.headers.get("x-proidu-timestamp", "")
    nonce = request.headers.get("x-proidu-nonce", "")
    signature = request.headers.get("x-proidu-signature", "")
    if not verify_hmac(secret, timestamp, nonce, signature, raw):
        raise HTTPException(401, "Invalid factory signature, nonce or time window")
    try:
        event = json.loads(raw)
    except (TypeError, json.JSONDecodeError):
        raise HTTPException(400, "Invalid JSON") from None
    if not isinstance(event, dict) or event.get("event_type") not in EVENT_OPERATIONS:
        raise HTTPException(422, "Unsupported factory event")
    if event.get("target") not in ("proidu", "proidu_global"):
        raise HTTPException(422, "Unknown target")
    if not isinstance(event.get("payload"), dict):
        raise HTTPException(422, "Payload must be a JSON object")
    # Avoid private data entering the public admissions candidate layer.
    prohibited = {"passport", "phone", "email", "telegram_user_id",
                  "student_id", "access_token", "password", "secret"}
    if prohibited.intersection(str(key).lower() for key in event["payload"]):
        raise HTTPException(422, "Personal/secret fields not allowed")
    pool = getattr(request.app.state, "pool", None)
    if pool is None:
        raise HTTPException(503, "Factory staging database not configured")
    payload_hash = hashlib.sha256(raw).hexdigest()
    envelope = {**event, "payload_sha256": payload_hash}
    with pool.connection() as conn:
        with conn.transaction():
            existing = conn.execute(
                "SELECT id::text,payload FROM ai_factory_bridge.requests WHERE correlation_id=%s",
                (nonce,),
            ).fetchone()
            if existing:
                if existing["payload"].get("payload_sha256") != payload_hash:
                    raise HTTPException(409, "Nonce replay with different payload")
                return {"status": "already_queued", "request_id": existing["id"]}
            row = conn.execute(
                """INSERT INTO ai_factory_bridge.requests(
                      operation,correlation_id,payload)
                   VALUES(%s,%s,%s) RETURNING id::text AS id""",
                (EVENT_OPERATIONS[event["event_type"]], nonce, Jsonb(envelope)),
            ).fetchone()
            return {"status": "pending_review", "request_id": row["id"]}
