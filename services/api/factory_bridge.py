"""Internal-only HMAC bridge to AI Factory, disabled unless explicitly configured.

Never expose the /internal/* path from Caddy. Use a private/VPN tunnel between
AI Factory and the staging service. No direct access to GI/AF tables.
AI Factory may return candidates/evidence, but may NEVER mark PROIDU records verified.
"""
from __future__ import annotations

import hashlib
import hmac
import json
import os
import re
import time
from uuid import UUID

import psycopg
from fastapi import APIRouter, HTTPException, Request
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb

router = APIRouter(prefix="/internal/factory/v1", tags=["internal AI Factory"])
MAX_BODY = 131_072
MAX_AGE_SECONDS = 300
VALID_STATUSES = frozenset(("completed", "failed", "rejected"))
DIGEST_RE = re.compile(r"^[a-f0-9]{64}$")


def authenticate(body: bytes, timestamp: str, signature: str, secret: str, now: int | None = None) -> None:
    if not secret or len(secret) < 32:
        raise HTTPException(status_code=503, detail="AI Factory bridge disabled")
    if len(body) > MAX_BODY:
        raise HTTPException(status_code=413, detail="Payload exceeds limit")
    if not timestamp.isascii() or not timestamp.isdigit() or len(timestamp) > 12:
        raise HTTPException(status_code=401, detail="Invalid timestamp")
    observed = int(time.time()) if now is None else now
    if abs(observed - int(timestamp)) > MAX_AGE_SECONDS:
        raise HTTPException(status_code=401, detail="Expired signature")
    if len(signature) != 64 or not DIGEST_RE.fullmatch(signature):
        raise HTTPException(status_code=401, detail="Invalid signature")
    expected = hmac.new(
        secret.encode("utf-8"), timestamp.encode("ascii") + b"." + body, hashlib.sha256
    ).hexdigest()
    if not hmac.compare_digest(expected, signature):
        raise HTTPException(status_code=401, detail="Signature mismatch")


@router.post("/responses")
async def accept_response(request: Request):
    """Accept only signed results for an existing unexpired request, never auto-publish."""
    raw = await request.body()
    authenticate(
        raw,
        request.headers.get("x-proidu-timestamp", ""),
        request.headers.get("x-proidu-signature", ""),
        os.getenv("PROIDU_FACTORY_HMAC_KEY", ""),
    )
    dsn = os.getenv("PROIDU_FACTORY_WRITE_DSN")
    if not dsn:
        raise HTTPException(status_code=503, detail="Factory bridge write role not configured")
    try:
        event = json.loads(raw)
    except (ValueError, UnicodeDecodeError) as exc:
        raise HTTPException(422, "Invalid JSON") from exc
    if not isinstance(event, dict):
        raise HTTPException(422, "Expected object")
    try:
        request_id = UUID(str(event["request_id"]))
    except (ValueError, KeyError, TypeError) as exc:
        raise HTTPException(422, "Invalid request ID") from exc
    status = event.get("status")
    if status not in VALID_STATUSES:
        raise HTTPException(422, "Invalid factory result status")
    result = event.get("result")
    if not isinstance(result, dict):
        raise HTTPException(422, "Expected object result")
    evidence_sha256 = event.get("evidence_sha256")
    if evidence_sha256 is not None and (
        not isinstance(evidence_sha256, str) or not DIGEST_RE.fullmatch(evidence_sha256)
    ):
        raise HTTPException(422, "Invalid evidence hash")
    # Connection is a separate least-privileged writer, not PROIDU's read-only API user.
    with psycopg.connect(dsn, autocommit=True, row_factory=dict_row) as conn:
        with conn.transaction():
            job = conn.execute(
                """SELECT id,state,expires_at FROM ai_factory_bridge.requests
                   WHERE id=%s FOR UPDATE""", (request_id,)
            ).fetchone()
            if not job or job["expires_at"].timestamp() < time.time():
                raise HTTPException(409, "No active factory request")
            exists = conn.execute(
                "SELECT id FROM ai_factory_bridge.responses WHERE request_id=%s",
                (request_id,),
            ).fetchone()
            if exists:
                return {"accepted": True, "duplicate": True}
            if job["state"] not in ("pending", "leased"):
                raise HTTPException(409, "Factory request is not accepting responses")
            conn.execute(
                """INSERT INTO ai_factory_bridge.responses
                   (request_id,status,result,evidence_sha256)
                   VALUES (%s,%s,%s,%s)""",
                (request_id, status, Jsonb(result), evidence_sha256),
            )
            conn.execute(
                "UPDATE ai_factory_bridge.requests SET state=%s WHERE id=%s",
                ("completed" if status == "completed" else status, request_id),
            )
    return {"accepted": True, "duplicate": False, "review_required": True}
