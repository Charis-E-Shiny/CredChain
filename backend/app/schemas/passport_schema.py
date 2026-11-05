"""
Pydantic schemas for CredChain Credit Passport and Verification.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, field_validator


class PassportGenerateRequest(BaseModel):
    """Request payload to generate and anchor a new credit passport."""

    wallet_address: str = Field(..., description="Ethereum wallet address of borrower (0x...)")
    consent: bool = Field(..., description="Explicit borrower consent to generate public verifiable passport")
    validity_days: int = Field(default=90, ge=1, le=365, description="Passport validity period in days")

    @field_validator("wallet_address")
    @classmethod
    def validate_wallet(cls, v: str) -> str:
        clean = v.strip().lower()
        if not clean.startswith("0x") or len(clean) != 42:
            raise ValueError("wallet_address must be a valid 42-character 0x hex address")
        return clean

    @field_validator("consent")
    @classmethod
    def validate_consent(cls, v: bool) -> bool:
        if not v:
            raise ValueError("Borrower consent is required to generate a credit passport")
        return v


class PassportResponse(BaseModel):
    """Response containing full passport details and verification links."""

    passport_id: str
    wallet_address: str
    reputation_score: int
    total_loans: int
    repaid_loans: int
    defaulted_loans: int
    total_borrowed: float
    total_repaid: float
    on_time_repayment_rate: float
    risk_category: str
    confidence: float
    data_hash: str
    issued_at: str
    expires_at: str
    revoked: bool
    revoked_at: Optional[str] = None
    tx_hash: Optional[str] = None
    canonical_data: Dict[str, Any]
    download_url: str
    verify_url: str
    status: str  # VALID / REVOKED / EXPIRED / INVALID
    financial_verification_status: Optional[str] = "UNVERIFIED"


class PassportVerificationResponse(BaseModel):
    """Result of independent verification against on-chain records and hash."""

    passport_id: str
    status: str  # VALID / REVOKED / EXPIRED / INVALID / NOT_FOUND
    is_valid: bool
    on_chain_verified: bool
    borrower: Optional[str] = None
    data_hash: Optional[str] = None
    computed_hash: Optional[str] = None
    hash_match: bool
    issued_at: Optional[str] = None
    expires_at: Optional[str] = None
    reputation_score: Optional[int] = None
    total_loans: Optional[int] = None
    repaid_loans: Optional[int] = None
    risk_category: Optional[str] = None
    financial_verification_status: Optional[str] = "UNVERIFIED"
    registry_address: str
    blockchain_network: str
    verification_timestamp: str
    message: str


class PassportRevokeRequest(BaseModel):
    """Request to revoke an active credit passport."""

    wallet_address: str = Field(..., description="Ethereum wallet address of passport owner")
    reason: Optional[str] = Field(default="Revoked by borrower", description="Reason for revocation")

    @field_validator("wallet_address")
    @classmethod
    def validate_wallet(cls, v: str) -> str:
        clean = v.strip().lower()
        if not clean.startswith("0x") or len(clean) != 42:
            raise ValueError("wallet_address must be a valid 42-character 0x hex address")
        return clean
