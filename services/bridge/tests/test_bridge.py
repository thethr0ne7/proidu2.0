import time
import pytest
from services.bridge.app import sign, verify_hmac, app
from fastapi.testclient import TestClient

SECRET="0123456789abcdef0123456789abcdef"


def test_signed_event_valid_and_tampering_rejected():
    ts=str(int(time.time()))
    nonce="stagingnonce0123456789"
    raw=b'{"event_type":"source.evidence.proposed","target":"proidu","payload":{}}'
    signature=sign(SECRET,ts,nonce,raw)
    assert verify_hmac(SECRET,ts,nonce,signature,raw)
    assert not verify_hmac(SECRET,ts,nonce,signature,raw+b"x")
    assert not verify_hmac(SECRET,ts,"short",signature,raw)
    assert not verify_hmac(SECRET,str(int(ts)-400),nonce,signature,raw,now=int(ts))


def test_bridge_disabled_without_secure_secret(monkeypatch):
    monkeypatch.delenv("AI_FACTORY_SHARED_SECRET",raising=False)
    with TestClient(app) as client:
        response=client.post("/v1/factory/events",json={})
    assert response.status_code==503
