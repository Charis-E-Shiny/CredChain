"""
API endpoints for borrower profiles.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.database.models import CreditAssessment, UserProfile
from app.schemas.loan_schema import BorrowerProfile

router = APIRouter(prefix="/borrowers", tags=["Borrowers"])


@router.get("/{wallet}/profile", response_model=BorrowerProfile)
def get_borrower_profile(wallet: str, db: Session = Depends(get_db)):
    """Get public borrower profile based on wallet address."""
    clean_wallet = wallet.lower()
    profile = db.query(UserProfile).filter(UserProfile.wallet_address == clean_wallet).first()

    # Get most recent assessment if available
    latest_assessment = (
        db.query(CreditAssessment)
        .filter(CreditAssessment.wallet_address == clean_wallet)
        .order_by(CreditAssessment.created_at.desc())
        .first()
    )

    recent_category = latest_assessment.risk_category if latest_assessment else None

    if not profile:
        return BorrowerProfile(
            wallet_address=clean_wallet,
            total_assessments=0,
            member_since="New User",
            recent_risk_category=None,
        )

    return BorrowerProfile(
        wallet_address=profile.wallet_address,
        total_assessments=profile.total_assessments,
        member_since=profile.created_at.strftime("%Y-%m-%d") if profile.created_at else "Unknown",
        recent_risk_category=recent_category,
    )
