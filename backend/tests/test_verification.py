"""
Unit and integration tests for the Borrower Financial Verification Layer.
Tests OCR salary slip parsing, gross vs net reconciliation, and AI scoring integration.
"""

import os
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.database.connection import create_schema
from app.services.prediction_service import load_model
from app.services.document_processing import DocumentProcessor

# Ensure tables exist and model is loaded for tests
create_schema()
load_model()

SYNTHETIC_SLIP_PATH = os.path.join(
    os.path.dirname(__file__), "fixtures", "synthetic_salary_slip.pdf"
)


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture(autouse=True)
def cleanup_test_data():
    """Ensure clean test database state before and after each test."""
    yield
    from app.database.connection import SessionLocal
    from app.database.models import VerificationDocument, BorrowerVerification, CreditAssessment
    db = SessionLocal()
    try:
        test_addresses = [
            "0x1111111111111111111111111111111111111111",
            "0x2222222222222222222222222222222222222222",
            "0x3333333333333333333333333333333333333333",
            "0x4444444444444444444444444444444444444444",
            "0x5555555555555555555555555555555555555555",
            "0x6666666666666666666666666666666666666666",
            "0x7777777777777777777777777777777777777777",
            "0x8888888888888888888888888888888888888888",
            "0x9999999999999999999999999999999999999999",
            "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        ]
        db.query(VerificationDocument).filter(VerificationDocument.wallet_address.in_(test_addresses)).delete(synchronize_session=False)
        db.query(BorrowerVerification).filter(BorrowerVerification.wallet_address.in_(test_addresses)).delete(synchronize_session=False)
        db.query(CreditAssessment).filter(CreditAssessment.wallet_address.in_(test_addresses)).delete(synchronize_session=False)
        db.commit()
    finally:
        db.close()


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


def test_synthetic_salary_slip_independent_extraction():
    """
    Direct extraction test on the synthetic salary slip fixture:
    - Gross salary must extract as $6,250.00
    - Net salary must extract as $5,000.00
    - Basic salary must extract as $5,000.00
    - Allowances must extract as $1,250.00
    - Total deductions must extract as $1,250.00
    """
    assert os.path.exists(SYNTHETIC_SLIP_PATH), f"Fixture not found at {SYNTHETIC_SLIP_PATH}"

    result = DocumentProcessor.process_file(SYNTHETIC_SLIP_PATH, "pdf")

    assert result.is_gross_identified is True
    assert result.gross_monthly_salary == 6250.0, f"Expected 6250.0 gross, got {result.gross_monthly_salary}"
    assert result.net_monthly_salary == 5000.0, f"Expected 5000.0 net, got {result.net_monthly_salary}"
    assert result.basic_salary == 5000.0, f"Expected 5000.0 basic, got {result.basic_salary}"
    assert result.total_deductions == 1250.0, f"Expected 1250.0 deductions, got {result.total_deductions}"
    assert result.allowances == 1250.0, f"Expected 1250.0 allowances, got {result.allowances}"
    assert result.status_flag == "EVIDENCE_CHECKED"


def test_synthetic_salary_slip_reconciliation_workflow(client):
    """
    Requirement 9:
    Upload synthetic payslip with declared gross annual income $75,000 ($6,250/mo):
    - Gross salary must extract as $6,250
    - Net salary must extract as $5,000
    - Gross income variance must be 0.00%
    - Evidence status should be EVIDENCE_CHECKED, NOT SOURCE_VERIFIED
    """
    test_wallet = "0x7777777777777777777777777777777777777777"

    with open(SYNTHETIC_SLIP_PATH, "rb") as f:
        upload_res = client.post(
            "/api/verification/upload",
            data={"wallet_address": test_wallet, "document_type": "salary_slip"},
            files={"file": ("synthetic_payslip.pdf", f, "application/pdf")},
        )
    assert upload_res.status_code == 200
    upload_data = upload_res.json()
    assert upload_data["status"] == "EVIDENCE_CHECKED"
    assert upload_data["extracted_gross_income"] == 6250.0
    assert upload_data["extracted_net_income"] == 5000.0

    # Run discrepancy reconciliation with declared annual income $75,000 ($6,250 / mo)
    proc_res = client.post(
        "/api/verification/process",
        json={
            "wallet_address": test_wallet,
            "declared_annual_income": 75000.0,
            "declared_monthly_debt": 800.0,
            "declared_employment_years": 4.0,
            "tolerance_percentage": 5.0,
        },
    )
    assert proc_res.status_code == 200
    proc_data = proc_res.json()

    # Assertions per requirements:
    assert proc_data["declared_monthly_income"] == 6250.0
    assert proc_data["extracted_monthly_income"] == 6250.0
    assert proc_data["extracted_gross_monthly_income"] == 6250.0
    assert proc_data["extracted_net_monthly_income"] == 5000.0
    assert proc_data["discrepancy_percentage"] == 0.0  # 0% variance!
    assert proc_data["is_within_tolerance"] is True
    assert proc_data["status"] == "EVIDENCE_CHECKED"
    assert proc_data["status"] != "SOURCE_VERIFIED"
    assert proc_data["requires_manual_review"] is False

    # Check status endpoint
    status_res = client.get(f"/api/verification/status/{test_wallet}")
    assert status_res.status_code == 200
    st_data = status_res.json()
    assert st_data["status"] == "EVIDENCE_CHECKED"
    assert st_data["extracted_gross_monthly_income"] == 6250.0
    assert st_data["extracted_net_monthly_income"] == 5000.0
    assert st_data["basic_salary"] == 5000.0
    assert st_data["allowances"] == 1250.0
    assert st_data["total_deductions"] == 1250.0
    assert st_data["discrepancy_percentage"] == 0.0


def test_never_substitute_net_for_gross_when_gross_missing(client, tmp_path):
    """
    Requirement 6: If gross salary cannot be identified confidently,
    return MANUAL_REVIEW instead of silently using net salary.
    """
    import fitz
    test_wallet = "0x8888888888888888888888888888888888888888"

    # Create PDF with ONLY Net Pay
    pdf_path = tmp_path / "net_only.pdf"
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((50, 100), "Net Pay (Take-Home): $5,000.00")
    doc.save(str(pdf_path))

    with open(pdf_path, "rb") as f:
        up_res = client.post(
            "/api/verification/upload",
            data={"wallet_address": test_wallet, "document_type": "salary_slip"},
            files={"file": ("net_only.pdf", f, "application/pdf")},
        )
    assert up_res.status_code == 200
    up_data = up_res.json()
    # Gross was missing, so initial status must be MANUAL_REVIEW
    assert up_data["status"] == "MANUAL_REVIEW"
    assert up_data["extracted_gross_income"] is None
    assert up_data["extracted_net_income"] == 5000.0

    # Reconciliation must flag MANUAL_REVIEW and NOT silently substitute net $5,000 as gross
    proc_res = client.post(
        "/api/verification/process",
        json={
            "wallet_address": test_wallet,
            "declared_annual_income": 60000.0,  # $5,000/mo declared
            "declared_monthly_debt": 500.0,
            "declared_employment_years": 2.0,
            "tolerance_percentage": 5.0,
        },
    )
    assert proc_res.status_code == 200
    proc_data = proc_res.json()
    assert proc_data["status"] == "MANUAL_REVIEW"
    assert proc_data["requires_manual_review"] is True
    assert "Gross Monthly Salary could not be identified" in proc_data["explanation"]


def test_verification_process_discrepancy_flags_manual_review(client, tmp_path):
    """Borrower declares $80,000/yr ($6,666.67/mo) but evidence gross is $4,000 -> MANUAL_REVIEW."""
    import fitz
    test_wallet = "0x3333333333333333333333333333333333333333"

    pdf_path = tmp_path / "low_gross.pdf"
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((50, 100), "Gross Monthly Pay: $4,000.00\nNet Monthly Pay: $3,200.00")
    doc.save(str(pdf_path))

    with open(pdf_path, "rb") as f:
        client.post(
            "/api/verification/upload",
            data={"wallet_address": test_wallet, "document_type": "salary_slip"},
            files={"file": ("low_gross.pdf", f, "application/pdf")},
        )

    proc_res = client.post(
        "/api/verification/process",
        json={
            "wallet_address": test_wallet,
            "declared_annual_income": 80000.0,
            "declared_monthly_debt": 1000.0,
            "declared_employment_years": 3.0,
            "tolerance_percentage": 5.0,
        },
    )
    assert proc_res.status_code == 200
    proc_data = proc_res.json()
    assert proc_data["status"] == "MANUAL_REVIEW"
    assert proc_data["is_within_tolerance"] is False
    assert proc_data["requires_manual_review"] is True
    assert proc_data["discrepancy_percentage"] > 25.0


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


def test_ai_credit_assessment_affected_by_verification_status(client):
    """
    Test that credit assessment score and confidence are affected by verification status:
    - EVIDENCE_CHECKED borrower receives risk score discount vs UNVERIFIED borrower
    """
    wallet_unverified = "0x9999999999999999999999999999999999999999"
    wallet_verified = "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"

    assessment_payload = {
        "annual_income": 75000.0,
        "monthly_debt": 800.0,
        "employment_length_years": 4.0,
        "home_ownership": "RENT",
        "loan_amount": 3000.0,
        "loan_purpose": "PERSONAL",
        "credit_history_length_years": 5.0,
        "num_open_accounts": 4,
        "num_delinquencies": 0,
        "debt_to_income_ratio": 0.128,
        "consent": True,
    }

    # 1. Run assessment for unverified borrower
    res_unverif = client.post(
        "/api/credit/assess",
        json={**assessment_payload, "wallet_address": wallet_unverified},
    )
    assert res_unverif.status_code == 200
    data_unverif = res_unverif.json()
    assert data_unverif["verification_status"] == "UNVERIFIED"
    assert data_unverif["verification_adjustment"] > 0  # penalty applied

    # 2. Upload synthetic slip and verify second borrower
    with open(SYNTHETIC_SLIP_PATH, "rb") as f:
        client.post(
            "/api/verification/upload",
            data={"wallet_address": wallet_verified, "document_type": "salary_slip"},
            files={"file": ("synthetic.pdf", f, "application/pdf")},
        )
    client.post(
        "/api/verification/process",
        json={
            "wallet_address": wallet_verified,
            "declared_annual_income": 75000.0,
            "declared_monthly_debt": 800.0,
            "declared_employment_years": 4.0,
            "tolerance_percentage": 5.0,
        },
    )

    # 3. Run assessment for verified borrower
    res_verif = client.post(
        "/api/credit/assess",
        json={**assessment_payload, "wallet_address": wallet_verified},
    )
    assert res_verif.status_code == 200
    data_verif = res_verif.json()
    assert data_verif["verification_status"] == "EVIDENCE_CHECKED"
    assert data_verif["verification_adjustment"] < 0  # discount applied!
    assert data_verif["risk_score"] < data_unverif["risk_score"]  # Lower risk score for verified borrower
    assert data_verif["confidence"] >= data_unverif["confidence"]  # Higher confidence
    assert data_verif["extracted_gross_monthly_income"] == 6250.0
    assert data_verif["extracted_net_monthly_income"] == 5000.0
    assert data_verif["reconciliation_variance"] == 0.0


def test_delete_verification_document(client, tmp_path):
    """Uploading and then deleting a document removes it and resets status."""
    import fitz
    test_wallet = "0x6666666666666666666666666666666666666666"

    # Create valid dummy PDF
    pdf_path = tmp_path / "temp_salary.pdf"
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((50, 100), "Gross Salary: Rs. 80,000.00\nNet Salary: Rs. 65,000.00")
    doc.save(str(pdf_path))

    with open(pdf_path, "rb") as f:
        up_res = client.post(
            "/api/verification/upload",
            data={"wallet_address": test_wallet, "document_type": "salary_slip"},
            files={"file": ("temp_salary.pdf", f, "application/pdf")},
        )
    assert up_res.status_code == 200
    doc_id = up_res.json()["document_id"]

    # Verify document appears in status
    st_res = client.get(f"/api/verification/status/{test_wallet}")
    assert st_res.status_code == 200
    assert len(st_res.json()["documents"]) == 1

    # Delete the document
    del_res = client.delete(f"/api/verification/document/{doc_id}?wallet_address={test_wallet}")
    assert del_res.status_code == 200
    assert del_res.json()["document_id"] == doc_id

    # Verify document is removed
    st_res_after = client.get(f"/api/verification/status/{test_wallet}")
    assert st_res_after.status_code == 200
    assert len(st_res_after.json()["documents"]) == 0
    assert st_res_after.json()["status"] == "UNVERIFIED"
