"""
Pydantic schemas for loan records.
"""

from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field


class LoanStatus(str, Enum):
    PENDING = "PENDING"
    ACTIVE = "ACTIVE"
    REPAID = "REPAID"
    DEFAULTED = "DEFAULTED"


class LoanRecordSchema(BaseModel):
    """Schema for a single loan record."""

    id: str
    loan_id: str
    wallet_address: str
    amount: float
    status: LoanStatus
    risk_assessment_id: Optional[str] = None
    created_at: str
    updated_at: str

    model_config = {"from_attributes": True}


class LoanListResponse(BaseModel):
    """Paginated list of loan records."""

    loans: List[LoanRecordSchema]
    total: int
    page: int
    page_size: int


class BorrowerProfile(BaseModel):
    """Public borrower profile summary."""

    wallet_address: str
    total_assessments: int
    member_since: str
    recent_risk_category: Optional[str] = None
    disclaimer: str = "Educational prototype only. Not for real financial decisions."
