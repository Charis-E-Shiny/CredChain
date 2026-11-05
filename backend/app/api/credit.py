"""
API endpoints for credit risk assessment.
"""

import json
import logging
from datetime import datetime, timezone
from typing import List

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

    # Apply Verification Standing impact on AI Risk Score and Confidence
    # SOURCE_VERIFIED: -15% relative risk discount, +0.08 confidence
    # EVIDENCE_CHECKED: -6% relative risk discount, +0.05 confidence
    # UNVERIFIED: +8% relative risk penalty, capped confidence (0.75)
    # MANUAL_REVIEW: +15% relative risk penalty, capped confidence (0.70), manual review flag
    if verif_status == "SOURCE_VERIFIED":
        adjustment = -0.15 * float(raw_risk_score)
        confidence = min(0.98, float(raw_confidence) + 0.08)
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
        adjustment = -0.06 * float(raw_risk_score)
        confidence = min(0.95, float(raw_confidence) + 0.05)
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
        adjustment = 0.15 * float(raw_risk_score) + 0.05
        confidence = min(0.70, float(raw_confidence))
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
        adjustment = 0.08 * float(raw_risk_score) + 0.02
        confidence = min(0.75, float(raw_confidence))
        factors.insert(
            0,
            FeatureImportance(
                feature_name="Unverified Self-Declaration",
                importance_value=0.08,
                direction="positive",
            ),
        )
        eligibility = "Provisional unverified assessment. Upload salary slip at /verification for rate discount and higher borrowing limits."

    final_risk_score = round(min(0.98, max(0.02, float(raw_risk_score) + adjustment)), 4)

    # Classify final risk category based on adjusted score
    if final_risk_score < 0.35:
        risk_category = RiskCategory.LOW
    elif final_risk_score < 0.65:
        risk_category = RiskCategory.MEDIUM
    else:
        risk_category = RiskCategory.HIGH

    model_ver = get_model_version()
    now_utc = datetime.now(timezone.utc)
    now_iso = now_utc.isoformat()

    # Save to database
    assessment = CreditAssessment(
        wallet_address=request.wallet_address.lower(),
        risk_score=float(final_risk_score),
        risk_category=risk_category.value if hasattr(risk_category, "value") else str(risk_category),
        confidence=float(confidence),
        features_json=json.dumps(raw_dict),
        model_version=model_ver,
        consent_given=True,
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
        )
        for a in assessments
    ]

    return CreditHistoryResponse(
        wallet_address=clean_wallet,
        assessments=items,
        total=len(items),
    )
