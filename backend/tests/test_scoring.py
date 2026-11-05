"""
Tests for verification-aware scoring and assessment integrity.

Covers:
- the verification standing changes the score (not only the label)
- each assessment is bound to a hash over its inputs, scores and standing
- tampering with the stored score, features, or hash is detected
- a verification status change produces a new, re-scored assessment
- the on-chain hash comparison in the verify endpoint
"""

import json
import uuid

import pytest
from fastapi.testclient import TestClient

from app.database.connection import SessionLocal, create_schema
from app.database.models import BorrowerVerification, CreditAssessment
from app.main import app
from app.schemas.verification_schema import VerificationStatusEnum
from app.services.prediction_service import load_model
from app.services.scoring_service import (
    apply_verification_standing,
    compute_assessment_hash,
    rescore_wallet,
    verify_assessment_row,
)
from app.services.verification_service import VerificationService

create_schema()
load_model()


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


def _new_wallet() -> str:
    # Unique per test so reruns against a persistent database do not interfere.
    return "0x" + uuid.uuid4().hex[:40]


def _payload(wallet: str) -> dict:
    return {
        "annual_income": 120000.0,
        "monthly_debt": 1000.0,
        "employment_length_years": 8.0,
        "home_ownership": "MORTGAGE",
        "loan_amount": 3000.0,
        "loan_purpose": "PERSONAL",
        "credit_history_length_years": 10.0,
        "num_open_accounts": 4,
        "num_delinquencies": 0,
        "debt_to_income_ratio": 0.10,
        "wallet_address": wallet,
        "consent": True,
    }


def _assess(client: TestClient, wallet: str) -> dict:
    response = client.post("/api/credit/assess", json=_payload(wallet))
    assert response.status_code == 200, response.text
    return response.json()


# ---------------------------------------------------------------------------
# Standing rules (pure functions)
# ---------------------------------------------------------------------------

def test_standing_orders_scores_by_verification_strength():
    raw, conf = 0.5, 0.8
    scores = {
        status: apply_verification_standing(raw, conf, status).final_risk_score
        for status in ["SOURCE_VERIFIED", "EVIDENCE_CHECKED", "UNVERIFIED", "MANUAL_REVIEW"]
    }
    assert scores["SOURCE_VERIFIED"] < scores["EVIDENCE_CHECKED"] < scores["UNVERIFIED"] < scores["MANUAL_REVIEW"]


def test_verified_status_changes_the_score_for_the_same_model_output():
    unverified = apply_verification_standing(0.4, 0.8, "UNVERIFIED")
    verified = apply_verification_standing(0.4, 0.8, "EVIDENCE_CHECKED")
    assert verified.final_risk_score < unverified.final_risk_score
    assert verified.confidence > unverified.confidence


def test_unknown_status_is_treated_as_unverified():
    assert apply_verification_standing(0.3, 0.8, "NOT_A_STATUS") == apply_verification_standing(0.3, 0.8, "UNVERIFIED")


def test_final_score_is_clamped():
    assert apply_verification_standing(0.0, 0.5, "SOURCE_VERIFIED").final_risk_score >= 0.02
    assert apply_verification_standing(1.0, 0.5, "MANUAL_REVIEW").final_risk_score <= 0.98


# ---------------------------------------------------------------------------
# Hash binding
# ---------------------------------------------------------------------------

def _record(**overrides) -> dict:
    base = {
        "wallet_address": "0xABCDEF0000000000000000000000000000000001",
        "features": {"annual_income": 120000.0, "loan_amount": 3000.0},
        "raw_risk_score": 0.4,
        "raw_confidence": 0.8,
        "final_risk_score": 0.34,
        "confidence": 0.85,
        "verification_status": "EVIDENCE_CHECKED",
        "verification_record_hash": "0x" + "a" * 64,
        "model_version": "v1",
        "assessed_at": "2026-11-05T09:00:00+00:00",
    }
    base.update(overrides)
    return base


def test_hash_is_bytes32_and_deterministic():
    h1 = compute_assessment_hash(_record())
    h2 = compute_assessment_hash(_record())
    assert h1 == h2
    assert h1.startswith("0x") and len(h1) == 66


def test_hash_does_not_depend_on_feature_key_order():
    a = _record(features={"annual_income": 1.0, "loan_amount": 2.0})
    b = _record(features={"loan_amount": 2.0, "annual_income": 1.0})
    assert compute_assessment_hash(a) == compute_assessment_hash(b)


@pytest.mark.parametrize(
    "field,value",
    [
        ("final_risk_score", 0.35),
        ("raw_risk_score", 0.41),
        ("verification_status", "SOURCE_VERIFIED"),
        ("verification_record_hash", "0x" + "b" * 64),
        ("features", {"annual_income": 999.0, "loan_amount": 3000.0}),
        ("assessed_at", "2026-11-05T10:00:00+00:00"),
        ("model_version", "v2"),
    ],
)
def test_hash_changes_when_any_bound_field_changes(field, value):
    assert compute_assessment_hash(_record()) != compute_assessment_hash(_record(**{field: value}))


# ---------------------------------------------------------------------------
# API: assessment stores integrity fields and verify endpoint checks them
# ---------------------------------------------------------------------------

def test_assessment_returns_hash_and_standing_snapshot(client):
    wallet = _new_wallet()
    data = _assess(client, wallet)
    assert data["assessment_hash"].startswith("0x") and len(data["assessment_hash"]) == 66
    assert data["verification_status"] == "UNVERIFIED"
    assert data["raw_risk_score"] is not None


def test_untouched_assessment_verifies_as_valid_and_current(client):
    wallet = _new_wallet()
    data = _assess(client, wallet)
    result = client.get(f"/api/credit/verify/{data['assessment_id']}").json()
    assert result["valid"] is True
    assert result["stale"] is False
    assert all(result["checks"].values())


def test_verify_detects_tampered_score(client):
    wallet = _new_wallet()
    data = _assess(client, wallet)
    db = SessionLocal()
    try:
        row = db.query(CreditAssessment).filter(CreditAssessment.id == data["assessment_id"]).one()
        row.risk_score = 0.05  # someone edits the stored score
        db.commit()
    finally:
        db.close()

    result = client.get(f"/api/credit/verify/{data['assessment_id']}").json()
    assert result["valid"] is False
    assert result["checks"]["score_consistent"] is False


def test_verify_detects_tampered_features(client):
    wallet = _new_wallet()
    data = _assess(client, wallet)
    db = SessionLocal()
    try:
        row = db.query(CreditAssessment).filter(CreditAssessment.id == data["assessment_id"]).one()
        features = json.loads(row.features_json)
        features["annual_income"] = 1_000_000.0  # inflate income after the fact
        row.features_json = json.dumps(features)
        db.commit()
    finally:
        db.close()

    result = client.get(f"/api/credit/verify/{data['assessment_id']}").json()
    assert result["valid"] is False
    assert result["checks"]["hash_matches"] is False


def test_verify_reports_onchain_mismatch(client):
    wallet = _new_wallet()
    data = _assess(client, wallet)
    wrong = "0x" + "0" * 64
    result = client.get(f"/api/credit/verify/{data['assessment_id']}", params={"onchain_hash": wrong}).json()
    assert result["valid"] is False
    assert result["checks"]["matches_onchain"] is False

    right = client.get(f"/api/credit/verify/{data['assessment_id']}", params={"onchain_hash": data["assessment_hash"]}).json()
    assert right["valid"] is True
    assert right["checks"]["matches_onchain"] is True


def test_verify_unknown_assessment_is_404(client):
    response = client.get("/api/credit/verify/does-not-exist")
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# Verification changes re-score the borrower
# ---------------------------------------------------------------------------

def test_status_change_creates_rescored_assessment_and_keeps_history(client):
    wallet = _new_wallet()
    first = _assess(client, wallet)

    db = SessionLocal()
    try:
        bv = db.query(BorrowerVerification).filter(BorrowerVerification.wallet_address == wallet).one()
        bv.status = "EVIDENCE_CHECKED"
        bv.record_hash = "0x" + "c" * 64
        new_row = rescore_wallet(db, wallet, bv.status, bv.record_hash)
        db.commit()
        assert new_row is not None
        new_id = new_row.id
        new_score = new_row.risk_score
        old_row = db.query(CreditAssessment).filter(CreditAssessment.id == first["assessment_id"]).one()
        old_score = old_row.risk_score
    finally:
        db.close()

    assert new_score < old_score, "verified borrower must receive a lower score than the unverified assessment"

    latest = client.get(f"/api/credit/history/{wallet}").json()["assessments"][0]
    assert latest["assessment_id"] == new_id
    assert latest["verification_status"] == "EVIDENCE_CHECKED"

    old_check = client.get(f"/api/credit/verify/{first['assessment_id']}").json()
    assert old_check["valid"] is True          # the old assessment is intact...
    assert old_check["stale"] is True          # ...but no longer reflects the borrower's standing

    new_check = client.get(f"/api/credit/verify/{new_id}").json()
    assert new_check["valid"] is True
    assert new_check["stale"] is False


def test_rescore_is_noop_when_standing_unchanged(client):
    wallet = _new_wallet()
    _assess(client, wallet)
    db = SessionLocal()
    try:
        bv = db.query(BorrowerVerification).filter(BorrowerVerification.wallet_address == wallet).one()
        result = rescore_wallet(db, wallet, bv.status, bv.record_hash)
        assert result is None
    finally:
        db.close()


def test_admin_review_triggers_rescore_of_the_ai_score(client):
    wallet = _new_wallet()
    first = _assess(client, wallet)

    db = SessionLocal()
    try:
        VerificationService.admin_review_and_update(
            db,
            wallet_address=wallet,
            target_status=VerificationStatusEnum.SOURCE_VERIFIED,
            notes="Confirmed against bank feed in test.",
        )
        latest = (
            db.query(CreditAssessment)
            .filter(CreditAssessment.wallet_address == wallet)
            .order_by(CreditAssessment.created_at.desc())
            .first()
        )
        assert latest.id != first["assessment_id"]
        assert latest.verification_status == "SOURCE_VERIFIED"
        assert latest.risk_score < first["risk_score"]
    finally:
        db.close()
