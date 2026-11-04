"""
SQLAlchemy ORM models for CredChain.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, Float, Integer, String, Text

from app.database.connection import Base


def _generate_uuid() -> str:
    return str(uuid.uuid4())


class CreditAssessment(Base):
    """Stores individual credit risk assessment results."""

    __tablename__ = "credit_assessments"

    id = Column(String, primary_key=True, default=_generate_uuid)
    wallet_address = Column(String, index=True, nullable=False)
    risk_score = Column(Float, nullable=False)
    risk_category = Column(String, nullable=False)  # LOW / MEDIUM / HIGH
    confidence = Column(Float, nullable=False)
    features_json = Column(Text, nullable=True)  # JSON-serialized input features
    model_version = Column(String, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    consent_given = Column(Boolean, default=False)


class LoanRecord(Base):
    """Tracks loan records linked to on-chain loan IDs."""

    __tablename__ = "loan_records"

    id = Column(String, primary_key=True, default=_generate_uuid)
    loan_id = Column(String, unique=True, nullable=False)  # On-chain loan ID
    wallet_address = Column(String, index=True, nullable=False)
    amount = Column(Float, nullable=False)
    status = Column(String, default="PENDING")  # PENDING / ACTIVE / REPAID / DEFAULTED
    risk_assessment_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class UserProfile(Base):
    """Basic borrower profile indexed by wallet address."""

    __tablename__ = "user_profiles"

    id = Column(String, primary_key=True, default=_generate_uuid)
    wallet_address = Column(String, unique=True, index=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    total_assessments = Column(Integer, default=0)


class CreditPassport(Base):
    """Stores generated credit passports and on-chain verification snapshots."""

    __tablename__ = "credit_passports"

    id = Column(String, primary_key=True, default=_generate_uuid)
    passport_id = Column(String, unique=True, index=True, nullable=False)  # bytes32 hex string
    wallet_address = Column(String, index=True, nullable=False)
    reputation_score = Column(Integer, default=50)
    total_loans = Column(Integer, default=0)
    repaid_loans = Column(Integer, default=0)
    defaulted_loans = Column(Integer, default=0)
    total_borrowed = Column(Float, default=0.0)
    total_repaid = Column(Float, default=0.0)
    risk_category = Column(String, default="LOW")  # LOW / MEDIUM / HIGH
    confidence = Column(Float, default=0.0)
    data_hash = Column(String, nullable=False)  # 0x-prefixed sha256 bytes32
    issued_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    expires_at = Column(DateTime, nullable=False)
    revoked = Column(Boolean, default=False)
    revoked_at = Column(DateTime, nullable=True)
    tx_hash = Column(String, nullable=True)
    canonical_data_json = Column(Text, nullable=False)
    pdf_path = Column(String, nullable=True)

