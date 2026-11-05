"""
Pydantic schemas for credit assessment requests and responses.
"""

from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field, field_validator


class HomeOwnership(str, Enum):
    RENT = "RENT"
    OWN = "OWN"
    MORTGAGE = "MORTGAGE"


class LoanPurpose(str, Enum):
    PERSONAL = "PERSONAL"
    EDUCATION = "EDUCATION"
    MEDICAL = "MEDICAL"
    BUSINESS = "BUSINESS"
    DEBT_CONSOLIDATION = "DEBT_CONSOLIDATION"
    HOME_IMPROVEMENT = "HOME_IMPROVEMENT"
    OTHER = "OTHER"


class RiskCategory(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class CreditAssessmentRequest(BaseModel):
    """Input schema for requesting a credit risk assessment."""

    annual_income: float = Field(..., gt=0, description="Annual income in USD")
    monthly_debt: float = Field(..., ge=0, description="Total monthly debt payments")
    employment_length_years: float = Field(..., ge=0, description="Years of employment")
    home_ownership: HomeOwnership = Field(..., description="Home ownership status")
    loan_amount: float = Field(..., gt=0, description="Requested loan amount")
    loan_purpose: LoanPurpose = Field(default=LoanPurpose.PERSONAL, description="Purpose of the loan")
    credit_history_length_years: float = Field(..., ge=0, description="Length of credit history in years")
    num_open_accounts: int = Field(..., ge=0, description="Number of open credit accounts")
    num_delinquencies: int = Field(..., ge=0, description="Number of past delinquencies")
    debt_to_income_ratio: float = Field(..., ge=0, description="Debt-to-income ratio")
    wallet_address: str = Field(..., min_length=1, description="Blockchain wallet address (identifier only)")
    consent: bool = Field(..., description="User consent for data processing")

    @field_validator("consent")
    @classmethod
    def consent_must_be_true(cls, v: bool) -> bool:
        if not v:
            raise ValueError("Consent must be given to proceed with credit assessment")
        return v


class FeatureImportance(BaseModel):
    """Describes how a single feature contributed to the prediction."""

    feature_name: str
    importance_value: float
    direction: str  # "positive" or "negative" — indicates risk-increasing vs decreasing


class CreditAssessmentResponse(BaseModel):
    """Output schema returned after a credit risk assessment."""

    risk_score: float = Field(..., ge=0, le=1, description="Predicted default probability (0-1)")
    predicted_default_probability: float = Field(default=0.0, ge=0, le=1, description="Alias for risk_score")
    risk_category: RiskCategory
    confidence: float = Field(..., ge=0, le=1, description="Model confidence in the prediction")
    contributing_factors: List[FeatureImportance] = Field(default_factory=list)
    eligibility: str = Field(..., description="Human-readable eligibility statement")
    model_version: str
    assessment_id: str
    timestamp: str
    disclaimer: str = "Educational prototype only. Not for real financial decisions."

    # Verification Layer attributes
    verification_status: str = Field(default="UNVERIFIED", description="UNVERIFIED / EVIDENCE_CHECKED / SOURCE_VERIFIED / MANUAL_REVIEW")
    declared_income: float = Field(default=0.0, description="Declared annual income")
    extracted_income: Optional[float] = Field(default=None, description="Extracted annual income from evidence")
    income_discrepancy_percentage: Optional[float] = Field(default=None, description="Percentage discrepancy between declared and extracted")
    requires_manual_review: bool = Field(default=False, description="Flag indicating human review requirement")

    model_config = {"from_attributes": True}


class CreditHistoryItem(BaseModel):
    """A single past assessment summary."""

    assessment_id: str
    risk_score: float
    risk_category: str
    confidence: float
    model_version: str
    created_at: str

    model_config = {"from_attributes": True}


class CreditHistoryResponse(BaseModel):
    """List of past assessments for a wallet."""

    wallet_address: str
    assessments: List[CreditHistoryItem]
    total: int
