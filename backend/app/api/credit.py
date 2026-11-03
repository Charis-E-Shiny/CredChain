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
from app.database.models import CreditAssessment, UserProfile
from app.schemas.credit_schema import (
    CreditAssessmentRequest,
    CreditAssessmentResponse,
    CreditHistoryItem,
    CreditHistoryResponse,
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
        risk_score, risk_category, confidence = predict_risk(features_array)
    except ModelNotLoadedError:
        # Fallback heuristic calculation if model artifacts not yet generated
        dti = request.debt_to_income_ratio
        delinq = request.num_delinquencies
        risk_score = min(1.0, max(0.0, (dti * 0.5) + (delinq * 0.15) + (request.loan_amount / max(request.annual_income, 1) * 0.35)))
        if risk_score < 0.35:
            risk_category = RiskCategory.LOW
        elif risk_score < 0.65:
            risk_category = RiskCategory.MEDIUM
        else:
            risk_category = RiskCategory.HIGH
        confidence = 0.85
    except Exception as exc:
        logger.error("Prediction error: %s", exc)
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(exc)}")

    # Generate explanations
    try:
        factors = explain_prediction(features_array, top_n=5)
    except Exception:
        factors = []

    model_ver = get_model_version()
    now_utc = datetime.now(timezone.utc)
    now_iso = now_utc.isoformat()

    # Determine eligibility statement
    if risk_category == RiskCategory.LOW:
        eligibility = "Eligible for standard and prime micro-lending tiers with preferred rates."
    elif risk_category == RiskCategory.MEDIUM:
        eligibility = "Eligible for micro-lending subject to collateral verification or multi-party approval."
    else:
        eligibility = "High risk profile. Requires higher collateralization and manual governance review."

    # Save to database
    assessment = CreditAssessment(
        wallet_address=request.wallet_address.lower(),
        risk_score=float(risk_score),
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

    return CreditAssessmentResponse(
        risk_score=float(risk_score),
        risk_category=risk_category,
        confidence=float(confidence),
        contributing_factors=factors,
        eligibility=eligibility,
        model_version=model_ver,
        assessment_id=str(assessment.id),
        timestamp=now_iso,
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
