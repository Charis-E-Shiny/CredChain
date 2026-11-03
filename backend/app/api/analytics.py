"""
API endpoints for system-wide analytics and overview.
"""

from typing import Dict
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.database.models import CreditAssessment, LoanRecord

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/overview")
def get_analytics_overview(db: Session = Depends(get_db)) -> Dict:
    """Retrieve platform analytics and credit scoring risk distribution."""
    total_assessments = db.query(CreditAssessment).count()
    assessments = db.query(CreditAssessment).all()

    if assessments:
        avg_risk = sum(a.risk_score for a in assessments) / len(assessments)
        low_count = sum(1 for a in assessments if a.risk_category == "LOW")
        med_count = sum(1 for a in assessments if a.risk_category == "MEDIUM")
        high_count = sum(1 for a in assessments if a.risk_category == "HIGH")
    else:
        avg_risk = 0.0
        low_count = 0
        med_count = 0
        high_count = 0

    total_loans = db.query(LoanRecord).count()

    return {
        "total_assessments": total_assessments,
        "average_risk_score": round(avg_risk, 4),
        "risk_distribution": {
            "LOW": low_count,
            "MEDIUM": med_count,
            "HIGH": high_count,
        },
        "total_loans_tracked": total_loans,
        "disclaimer": "Educational FinTech prototype data. Not representative of commercial lending.",
    }
