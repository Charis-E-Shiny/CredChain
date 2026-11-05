"""
Unit and integration tests for the Borrower Financial Verification Layer.
"""

import os
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.database.connection import Base, engine
from app.services.prediction_service import load_model

# Ensure tables exist and model is loaded for tests
Base.metadata.create_all(bind=engine)
load_model()


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


def test_verification_status_default_unverified(client):
    """Borrower with no documents should default to UNVERIFIED."""
    test_wallet = "0x1111111111111111111111111111111111111111"
    res = client.get(f"/api/verification/status/{test_wallet}")
    assert res.status_code == 200
    data = res.json()
    assert data["wallet_address"] == test_wallet.lower()
    assert data["status"] == "UNVERIFIED"
    assert data["can_proceed_standard_lending"] is False
    assert data["lending_route"] == "UNVERIFIED_RESTRICTED"


def test_verification_process_evidence_checked(client, tmp_path):
    """Borrower uploads evidence matching declaration within 5% tolerance -> EVIDENCE_CHECKED."""
    test_wallet = "0x2222222222222222222222222222222222222222"

    # Create dummy salary slip PDF
    import fitz
    pdf_path = tmp_path / "test_salary.pdf"
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((50, 100), "Net Salary: Rs. 80,000.00")
    doc.save(str(pdf_path))

    # Upload document
    with open(pdf_path, "rb") as f:
        upload_res = client.post(
            "/api/verification/upload",
            data={"wallet_address": test_wallet, "document_type": "salary_slip"},
            files={"file": ("salary.pdf", f, "application/pdf")},
        )
    assert upload_res.status_code == 200
    upload_data = upload_res.json()
    assert upload_data["status"] == "EVIDENCE_CHECKED"

    # Process discrepancy with declared annual income 960,000 (80,000 / mo)
    proc_res = client.post(
        "/api/verification/process",
        json={
            "wallet_address": test_wallet,
            "declared_annual_income": 960000.0,
            "declared_monthly_debt": 15000.0,
            "declared_employment_years": 4.0,
            "tolerance_percentage": 5.0,
        },
    )
    assert proc_res.status_code == 200
    proc_data = proc_res.json()
    assert proc_data["status"] == "EVIDENCE_CHECKED"
    assert proc_data["is_within_tolerance"] is True
    assert proc_data["discrepancy_percentage"] <= 5.0
    assert proc_data["requires_manual_review"] is False
    assert proc_data["record_hash"] is not None


def test_verification_process_discrepancy_flags_manual_review(client, tmp_path):
    """Borrower declares Rs. 80,000 but evidence shows Rs. 45,000 -> MANUAL_REVIEW."""
    test_wallet = "0x3333333333333333333333333333333333333333"

    import fitz
    pdf_path = tmp_path / "low_salary.pdf"
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((50, 100), "Take Home Pay: Rs. 45,000.00")
    doc.save(str(pdf_path))

    with open(pdf_path, "rb") as f:
        client.post(
            "/api/verification/upload",
            data={"wallet_address": test_wallet, "document_type": "salary_slip"},
            files={"file": ("low_salary.pdf", f, "application/pdf")},
        )

    proc_res = client.post(
        "/api/verification/process",
        json={
            "wallet_address": test_wallet,
            "declared_annual_income": 960000.0,  # 80,000 / mo
            "declared_monthly_debt": 10000.0,
            "declared_employment_years": 3.0,
            "tolerance_percentage": 5.0,
        },
    )
    assert proc_res.status_code == 200
    proc_data = proc_res.json()
    assert proc_data["status"] == "MANUAL_REVIEW"
    assert proc_data["is_within_tolerance"] is False
    assert proc_data["requires_manual_review"] is True
    assert proc_data["discrepancy_percentage"] > 40.0


def test_admin_review_can_assign_source_verified(client):
    """Authorized admin or verifier can assign SOURCE_VERIFIED with institutional provider reference."""
    test_wallet = "0x4444444444444444444444444444444444444444"

    review_res = client.post(
        "/api/verification/admin/review",
        json={
            "wallet_address": test_wallet,
            "target_status": "SOURCE_VERIFIED",
            "notes": "Verified via trusted open-banking aggregator integration.",
            "verifier_address": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
            "source_verifier_name": "CIBIL / OpenBanking Secure Feed",
        },
    )
    assert review_res.status_code == 200
    data = review_res.json()
    assert data["status"] == "SOURCE_VERIFIED"
    assert data["can_proceed_standard_lending"] is True
    assert data["lending_route"] == "SOURCE_VERIFIED"
    assert data["source_verifier_name"] == "CIBIL / OpenBanking Secure Feed"


def test_credit_assessment_integration_returns_verification_attributes(client):
    """POST /api/credit/assess returns verification_status, declared_income, etc."""
    test_wallet = "0x5555555555555555555555555555555555555555"

    res = client.post(
        "/api/credit/assess",
        json={
            "annual_income": 85000.0,
            "monthly_debt": 1200.0,
            "employment_length_years": 5.0,
            "home_ownership": "MORTGAGE",
            "loan_amount": 1000.0,
            "loan_purpose": "PERSONAL",
            "credit_history_length_years": 6.0,
            "num_open_accounts": 5,
            "num_delinquencies": 0,
            "debt_to_income_ratio": 0.17,
            "wallet_address": test_wallet,
            "consent": True,
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert "verification_status" in data
    assert "declared_income" in data
    assert "predicted_default_probability" in data
    assert "requires_manual_review" in data
    assert data["declared_income"] == 85000.0
    assert data["verification_status"] == "UNVERIFIED"
