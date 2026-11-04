"""
Unit tests for CredChain Credit Passport System.
Tests generation, canonical hashing consistency, on-chain anchoring, verification, revocation, and PDF generation.
"""

import hashlib
import json
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.passport_service import canonicalize_json, compute_sha256_hash


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


def test_canonical_json_and_hashing_consistency():
    """Verify that key order does not affect the deterministic SHA-256 hash."""
    data1 = {
        "passport_id": "0x123",
        "borrower": "0xabc",
        "reputation_score": 85,
        "total_loans": 2,
    }
    data2 = {
        "reputation_score": 85,
        "borrower": "0xabc",
        "total_loans": 2,
        "passport_id": "0x123",
    }

    c1 = canonicalize_json(data1)
    c2 = canonicalize_json(data2)
    assert c1 == c2

    h1 = compute_sha256_hash(c1)
    h2 = compute_sha256_hash(c2)
    assert h1 == h2
    assert h1.startswith("0x")
    assert len(h1) == 66  # '0x' + 64 hex chars = 32 bytes


def test_generate_passport_missing_consent(client):
    """Should reject passport generation when borrower consent is False."""
    payload = {
        "wallet_address": "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
        "consent": False,
        "validity_days": 90,
    }
    response = client.post("/api/passport/generate", json=payload)
    assert response.status_code == 422


def test_generate_passport_invalid_wallet(client):
    """Should reject invalid wallet format."""
    payload = {
        "wallet_address": "invalid-wallet-address",
        "consent": True,
        "validity_days": 90,
    }
    response = client.post("/api/passport/generate", json=payload)
    assert response.status_code == 422


def test_passport_lifecycle(client):
    """Full lifecycle: generate -> get -> verify -> download -> revoke -> verify."""
    wallet = "0x70997970c51812dc3a010c7d01b50e0d17dc79c8"

    # 1. Generate
    gen_payload = {
        "wallet_address": wallet,
        "consent": True,
        "validity_days": 60,
    }
    res = client.post("/api/passport/generate", json=gen_payload)
    assert res.status_code == 201
    data = res.json()
    passport_id = data["passport_id"]
    assert passport_id.startswith("0x")
    assert data["wallet_address"] == wallet.lower()
    assert data["status"] == "VALID"
    assert data["data_hash"].startswith("0x")

    # 2. Get Details
    get_res = client.get(f"/api/passport/{passport_id}")
    assert get_res.status_code == 200
    assert get_res.json()["passport_id"] == passport_id

    # 3. Independent Verify (Public endpoint)
    verify_res = client.get(f"/api/passport/{passport_id}/verify")
    assert verify_res.status_code == 200
    v_data = verify_res.json()
    assert v_data["passport_id"] == passport_id
    assert v_data["hash_match"] is True
    assert v_data["status"] == "VALID"
    assert v_data["is_valid"] is True

    # 4. Download PDF
    pdf_res = client.get(f"/api/passport/{passport_id}/download")
    assert pdf_res.status_code == 200
    assert pdf_res.headers["content-type"] == "application/pdf"
    assert len(pdf_res.content) > 1000

    # 5. Revoke by unauthorized wallet fails
    bad_revoke = client.post(
        f"/api/passport/{passport_id}/revoke",
        json={"wallet_address": "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc", "reason": "Unauthorized"},
    )
    assert bad_revoke.status_code == 403

    # 6. Revoke by owner succeeds
    good_revoke = client.post(
        f"/api/passport/{passport_id}/revoke",
        json={"wallet_address": wallet, "reason": "Testing revocation"},
    )
    assert good_revoke.status_code == 200
    assert good_revoke.json()["status"] == "REVOKED"
    assert good_revoke.json()["revoked"] is True

    # 7. Verify again -> status should now be REVOKED
    reverify_res = client.get(f"/api/passport/{passport_id}/verify")
    assert reverify_res.status_code == 200
    assert reverify_res.json()["status"] == "REVOKED"
    assert reverify_res.json()["is_valid"] is False

    # 8. List Borrower Passports
    list_res = client.get(f"/api/passport/borrower/{wallet}")
    assert list_res.status_code == 200
    p_list = list_res.json()
    assert len(p_list) >= 1
    assert any(p["passport_id"] == passport_id for p in p_list)
