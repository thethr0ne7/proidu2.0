import hashlib
import hmac
import json
import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from services.api.app import app
from services.api.factory_bridge import authenticate


def _sign(secret, timestamp, body):
    return hmac.new(
        secret.encode(), str(timestamp).encode() + b"." + body, hashlib.sha256
    ).hexdigest()


def test_factory_bridge_accepts_valid_signature():
    secret = "x" * 40
    body = b'{"status":"completed"}'
    authenticate(body, "2000000000", _sign(secret, "2000000000", body), secret, now=2000000000)


def test_factory_bridge_rejects_tampering_and_replay():
    secret = "x" * 40
    body = b'{"status":"completed"}'
    signature = _sign(secret, "2000000000", body)
    with pytest.raises(HTTPException) as error:
        authenticate(b'{"status":"failed"}', "2000000000", signature, secret, now=2000000000)
    assert error.value.status_code == 401
    with pytest.raises(HTTPException) as expired:
        authenticate(body, "2000000000", signature, secret, now=2000000500)
    assert expired.value.status_code == 401


def test_factory_bridge_disabled_without_secret():
    with pytest.raises(HTTPException) as error:
        authenticate(b"{}", "2000000000", "0" * 64, "", now=2000000000)
    assert error.value.status_code == 503


def test_factory_bridge_rejects_oversize_body():
    with pytest.raises(HTTPException) as error:
        authenticate(b"x" * 131073, "2000000000", "0" * 64, "x" * 40, now=2000000000)
    assert error.value.status_code == 413
