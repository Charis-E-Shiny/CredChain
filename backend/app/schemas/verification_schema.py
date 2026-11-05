"""
Pydantic schemas for the Borrower Financial Verification Layer.
"""

from enum import Enum
from typing import List, Optional
from datetime import datetime

from pydantic import BaseModel, Field


class VerificationStatusEnum(str, Enum):
    UNVERIFIED = "UNVERIFIED"
    EVIDENCE_CHECKED = "EVIDENCE_CHECKED"
    SOURCE_VERIFIED = "SOURCE_VERIFIED"
    MANUAL_REVIEW = "MANUAL_REVIEW"


class DocumentTypeEnum(str, Enum):
    SALARY_SLIP = "salary_slip"
    BANK_STATEMENT = "bank_statement"
    EMPLOYMENT_LETTER = "employment_letter"
    TAX_RETURN = "tax_return"
    OTHER = "other"


class DocumentItem(BaseModel):
    id: str
    file_name: str
    file_type: str
    file_size_bytes: int
    document_type: str
    upload_timestamp: str
    status: str
    extracted_income: Optional[float] = None  # Primary Gross Monthly Income
    extracted_gross_income: Optional[float] = None
    extracted_net_income: Optional[float] = None
    basic_salary: Optional[float] = None
    allowances: Optional[float] = None
    total_deductions: Optional[float] = None
    extraction_confidence: Optional[float] = None

    model_config = {"from_attributes": True}


class DocumentUploadResponse(BaseModel):
    document_id: str
    file_name: str
    file_type: str
    file_size_bytes: int
    document_type: str
    status: str
    extracted_gross_income: Optional[float] = None
    extracted_net_income: Optional[float] = None
    message: str


class ProcessVerificationRequest(BaseModel):
    wallet_address: str
    declared_annual_income: float = Field(..., gt=0)
    declared_monthly_debt: float = Field(default=0.0, ge=0)
    declared_employment_years: float = Field(default=0.0, ge=0)
    tolerance_percentage: float = Field(
        default=5.0,
        ge=1.0,
        le=25.0,
        description="Tolerance percentage for variance (default 5%)",
    )


class DiscrepancyReport(BaseModel):
    declared_annual_income: float
    declared_monthly_income: float  # Declared Gross Monthly
    extracted_monthly_income: float  # Extracted Gross Monthly
    extracted_gross_monthly_income: float = 0.0
    extracted_net_monthly_income: Optional[float] = None
    basic_salary: Optional[float] = None
    allowances: Optional[float] = None
    total_deductions: Optional[float] = None
    discrepancy_percentage: float  # Reconciliation Variance %
    tolerance_percentage: float
    is_within_tolerance: bool
    status: VerificationStatusEnum
    explanation: str
    detected_credits: List[float] = Field(default_factory=list)
    requires_manual_review: bool
    record_hash: Optional[str] = None


class VerificationStatusResponse(BaseModel):
    wallet_address: str
    status: VerificationStatusEnum
    declared_annual_income: float
    declared_monthly_income: float
    declared_monthly_debt: float
    declared_employment_years: float
    extracted_monthly_income: float
    extracted_gross_monthly_income: float = 0.0
    extracted_net_monthly_income: Optional[float] = None
    basic_salary: Optional[float] = None
    allowances: Optional[float] = None
    total_deductions: Optional[float] = None
    discrepancy_percentage: float
    tolerance_percentage: float = 5.0
    record_hash: Optional[str] = None
    verifier_notes: Optional[str] = None
    verifier_address: Optional[str] = None
    source_verifier_name: Optional[str] = None
    on_chain_tx_hash: Optional[str] = None
    documents: List[DocumentItem] = Field(default_factory=list)
    updated_at: str
    can_proceed_standard_lending: bool
    lending_route: str  # "STANDARD_VERIFIED", "SOURCE_VERIFIED", "UNVERIFIED_RESTRICTED", "MANUAL_REVIEW_REQUIRED"


class VerificationHistoryItem(BaseModel):
    id: str
    previous_status: str
    new_status: str
    changed_by: str
    reason: Optional[str] = None
    record_hash: Optional[str] = None
    created_at: str

    model_config = {"from_attributes": True}


class AdminReviewRequest(BaseModel):
    wallet_address: str
    target_status: VerificationStatusEnum
    notes: Optional[str] = ""
    verifier_address: Optional[str] = None
    source_verifier_name: Optional[str] = None


class AdminReviewItem(BaseModel):
    wallet_address: str
    status: VerificationStatusEnum
    declared_annual_income: float
    declared_monthly_income: float
    extracted_monthly_income: float
    extracted_gross_monthly_income: Optional[float] = 0.0
    extracted_net_monthly_income: Optional[float] = None
    discrepancy_percentage: float
    requires_manual_review: bool
    documents_count: int
    record_hash: Optional[str] = None
    updated_at: str
    verifier_notes: Optional[str] = None
