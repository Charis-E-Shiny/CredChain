"""
API endpoints for credit risk assessment.
"""

import json
import logging
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.database.models import BorrowerVerification, CreditAssessment, UserProfile
from app.schemas.credit_schema import (
    CreditAssessmentRequest,
    CreditAssessmentResponse,
    CreditHistoryItem,
    CreditHistoryResponse,
    FeatureImportance,
    RiskCategory,
)
from app.services.explanation_service import explain_prediction
from app.services.scoring_service import (
    apply_verification_standing,
    compute_assessment_hash,
    verify_assessment_row,
)
from app.services.feature_service import request_to_features
from app.services.prediction_service import (
    ModelNotLoadedError,
    get_model_version,
    is_model_loaded,
    predict_risk,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/credit", tags=["Credit Assessment"])


@router.post("/assess", response_model=CreditAssessmentResponse)
def assess_credit(
    request: CreditAssessmentRequest,
    db: Session = Depends(get_db),
):
    """
    Assess credit risk for a borrower based on consented financial attributes.
    Returns risk score, category, model confidence, and top contributing factors.
    """
    if not request.consent:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Borrower consent is required for credit assessment.",
        )

    # Transform features
    try:
        features_array = request_to_features(request)
        raw_dict = request.model_dump()
    except Exception as exc:
        logger.error("Feature extraction error: %s", exc)
        raise HTTPException(status_code=400, detail=f"Feature extraction failed: {str(exc)}")

    # Run prediction
    try:
        raw_risk_score, raw_risk_category, raw_confidence = predict_risk(features_array)
    except ModelNotLoadedError:
        # Fallback heuristic calculation if model artifacts not yet generated
        dti = request.debt_to_income_ratio
        delinq = request.num_delinquencies
        raw_risk_score = min(1.0, max(0.0, (dti * 0.5) + (delinq * 0.15) + (request.loan_amount / max(request.annual_income, 1) * 0.35)))
        if raw_risk_score < 0.35:
            raw_risk_category = RiskCategory.LOW
        elif raw_risk_score < 0.65:
            raw_risk_category = RiskCategory.MEDIUM
        else:
            raw_risk_category = RiskCategory.HIGH
        raw_confidence = 0.85
    except Exception as exc:
        logger.error("Prediction error: %s", exc)
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(exc)}")

    # Generate model explanations
    try:
        factors = explain_prediction(features_array, top_n=5)
    except Exception:
        factors = []

    # Sync with BorrowerVerification record
    clean_wallet = request.wallet_address.lower().strip()
    bv: Optional[BorrowerVerification] = (
        db.query(BorrowerVerification)
        .filter(BorrowerVerification.wallet_address == clean_wallet)
        .first()
    )

    if not bv:
        # Pre-seed verification record with declared values as UNVERIFIED
        bv = BorrowerVerification(
            wallet_address=clean_wallet,
            declared_annual_income=request.annual_income,
            declared_monthly_income=round(request.annual_income / 12.0, 2),
            declared_monthly_debt=request.monthly_debt,
            declared_employment_years=request.employment_length_years,
            extracted_monthly_income=0.0,
            extracted_gross_monthly_income=0.0,
            extracted_net_monthly_income=0.0,
            basic_salary=0.0,
            allowances=0.0,
            total_deductions=0.0,
            discrepancy_percentage=0.0,
            status="UNVERIFIED",
            verifier_notes="Initial self-declared financial profile registered.",
        )
        db.add(bv)
    else:
        # Update declared income if borrower has updated assessment values
        bv.declared_annual_income = request.annual_income
        bv.declared_monthly_income = round(request.annual_income / 12.0, 2)
        bv.declared_monthly_debt = request.monthly_debt
        bv.declared_employment_years = request.employment_length_years

    verif_status = bv.status
    standing = apply_verification_standing(float(raw_risk_score), float(raw_confidence), verif_status)
    adjustment = standing.adjustment
    confidence = standing.confidence
    final_risk_score = standing.final_risk_score
    risk_category = RiskCategory(standing.risk_category)

    if verif_status == "SOURCE_VERIFIED":
        factors.insert(
            0,
            FeatureImportance(
                feature_name="Authorized Source Verification",
                importance_value=-0.15,
                direction="negative",
            ),
        )
        eligibility = "Prime tier pre-approval. Source-verified income confirms lowest available micro-lending interest rates."
    elif verif_status == "EVIDENCE_CHECKED":
        factors.insert(
            0,
            FeatureImportance(
                feature_name="Document Income Evidence Verified",
                importance_value=-0.06,
                direction="negative",
            ),
        )
        eligibility = "Standard prime approval. Uploaded gross payroll evidence verified within tolerance."
    elif verif_status == "MANUAL_REVIEW":
        factors.insert(
            0,
            FeatureImportance(
                feature_name="Financial Evidence Discrepancy",
                importance_value=0.15,
                direction="positive",
            ),
        )
        eligibility = "High risk loading. Income discrepancy detected on evidence. Requires manual review before disbursement."
    else:  # UNVERIFIED
        factors.insert(
            0,
            FeatureImportance(
                feature_name="Unverified Self-Declaration",
                importance_value=0.08,
                direction="positive",
            ),
        )
        eligibility = "Provisional unverified assessment. Upload salary slip at /verification for rate discount and higher borrowing limits."

    model_ver = get_model_version()
    now_utc = datetime.now(timezone.utc)
    now_iso = now_utc.isoformat()

    # Bind the assessment to its inputs, scores, verification standing, and the
    # verification record it was computed from. The hash is what the loan request
    # commits on-chain, so any later change to the stored fields is detectable.
    assessed_at = now_iso
    features_json = json.dumps(raw_dict)
    assessment_hash = compute_assessment_hash({
        "wallet_address": request.wallet_address.lower(),
        "features": json.loads(features_json),
        "raw_risk_score": float(raw_risk_score),
        "raw_confidence": float(raw_confidence),
        "final_risk_score": final_risk_score,
        "confidence": round(float(confidence), 4),
        "verification_status": verif_status,
        "verification_record_hash": bv.record_hash,
        "model_version": model_ver,
        "assessed_at": assessed_at,
    })

    assessment = CreditAssessment(
        wallet_address=request.wallet_address.lower(),
        risk_score=float(final_risk_score),
        risk_category=risk_category.value,
        confidence=round(float(confidence), 4),
        features_json=features_json,
        model_version=model_ver,
        consent_given=True,
        raw_risk_score=float(raw_risk_score),
        raw_confidence=float(raw_confidence),
        verification_status=verif_status,
        verification_record_hash=bv.record_hash,
        verification_adjustment=round(adjustment, 4),
        assessed_at=assessed_at,
        assessment_hash=assessment_hash,
        created_at=now_utc,
    )
    db.add(assessment)

    # Update UserProfile
    profile = db.query(UserProfile).filter(UserProfile.wallet_address == request.wallet_address.lower()).first()
    if profile:
        profile.total_assessments += 1
    else:
        profile = UserProfile(
            wallet_address=request.wallet_address.lower(),
            total_assessments=1,
        )
        db.add(profile)

    db.commit()
    db.refresh(assessment)

    declared_inc = bv.declared_annual_income
    declared_monthly = bv.declared_monthly_income
    extracted_gross = bv.extracted_gross_monthly_income or bv.extracted_monthly_income
    extracted_net = bv.extracted_net_monthly_income if (bv.extracted_net_monthly_income and bv.extracted_net_monthly_income > 0) else None
    extracted_annual = extracted_gross * 12.0 if (extracted_gross and extracted_gross > 0) else None
    disc_pct = bv.discrepancy_percentage if (extracted_gross and extracted_gross > 0) else None
    req_manual = (verif_status == "MANUAL_REVIEW")

    return CreditAssessmentResponse(
        risk_score=float(final_risk_score),
        predicted_default_probability=float(final_risk_score),
        raw_risk_score=float(raw_risk_score),
        verification_adjustment=round(adjustment, 4),
        verification_score_adjustment=round(adjustment, 4),
        risk_category=risk_category,
        confidence=float(confidence),
        contributing_factors=factors,
        eligibility=eligibility,
        model_version=model_ver,
        assessment_id=str(assessment.id),
        timestamp=now_iso,
        verification_status=verif_status,
        declared_income=declared_inc,
        declared_gross_monthly_income=declared_monthly,
        extracted_income=extracted_annual,
        extracted_gross_monthly_income=extracted_gross if (extracted_gross and extracted_gross > 0) else None,
        extracted_net_monthly_income=extracted_net,
        income_discrepancy_percentage=disc_pct,
        reconciliation_variance=disc_pct,
        verification_notes=bv.verifier_notes,
        requires_manual_review=req_manual,
        assessment_hash=assessment_hash,
        verification_record_hash=bv.record_hash,
    )


@router.get("/history/{wallet}", response_model=CreditHistoryResponse)
def get_credit_history(
    wallet: str,
    db: Session = Depends(get_db),
):
    """Retrieve credit assessment history for a specific wallet address."""
    clean_wallet = wallet.lower()
    assessments = (
        db.query(CreditAssessment)
        .filter(CreditAssessment.wallet_address == clean_wallet)
        .order_by(CreditAssessment.created_at.desc())
        .all()
    )

    items = [
        CreditHistoryItem(
            assessment_id=a.id,
            risk_score=a.risk_score,
            risk_category=a.risk_category,
            confidence=a.confidence,
            model_version=a.model_version,
            created_at=a.created_at.isoformat() if a.created_at else "",
            verification_status=a.verification_status,
            assessment_hash=a.assessment_hash,
        )
        for a in assessments
    ]

    return CreditHistoryResponse(
        wallet_address=clean_wallet,
        assessments=items,
        total=len(items),
    )


@router.get("/verify/{assessment_id}")
def verify_assessment(
    assessment_id: str,
    onchain_hash: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Check a stored assessment for tampering and staleness.

    Recomputes the assessment hash from the stored fields, re-applies the
    verification standing to confirm the stored score, and compares the
    borrower's current verification status and record with the snapshot taken
    at assessment time. Pass ``onchain_hash`` to also compare the hash committed
    in the loan request.
    """
    row = db.query(CreditAssessment).filter(CreditAssessment.id == assessment_id).first()
    if row is None:
        raise HTTPException(status_code=404, detail="Assessment not found.")

    bv = db.query(BorrowerVerification).filter(BorrowerVerification.wallet_address == row.wallet_address).first()
    current_status = bv.status if bv else "UNVERIFIED"
    current_record = bv.record_hash if bv else None
    return verify_assessment_row(row, current_status, current_record, onchain_hash)
