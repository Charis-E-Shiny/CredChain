"""
API endpoints for loan records.
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.database.models import LoanRecord
from app.schemas.loan_schema import LoanListResponse, LoanRecordSchema

router = APIRouter(prefix="/loans", tags=["Loans"])


@router.get("", response_model=LoanListResponse)
def list_loans(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    wallet: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """List loan records with pagination and optional wallet filtering."""
    query = db.query(LoanRecord)
    if wallet:
        query = query.filter(LoanRecord.wallet_address == wallet.lower())

    total = query.count()
    offset = (page - 1) * page_size
    records = query.order_by(LoanRecord.created_at.desc()).offset(offset).limit(page_size).all()

    items = [
        LoanRecordSchema(
            id=r.id,
            loan_id=r.loan_id,
            wallet_address=r.wallet_address,
            amount=r.amount,
            status=r.status,
            risk_assessment_id=r.risk_assessment_id,
            created_at=r.created_at.isoformat() if r.created_at else "",
            updated_at=r.updated_at.isoformat() if r.updated_at else "",
        )
        for r in records
    ]

    return LoanListResponse(
        loans=items,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{loan_id}", response_model=LoanRecordSchema)
def get_loan(loan_id: str, db: Session = Depends(get_db)):
    """Get a specific loan record by on-chain ID or record ID."""
    record = (
        db.query(LoanRecord)
        .filter((LoanRecord.loan_id == loan_id) | (LoanRecord.id == loan_id))
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="Loan record not found.")

    return LoanRecordSchema(
        id=record.id,
        loan_id=record.loan_id,
        wallet_address=record.wallet_address,
        amount=record.amount,
        status=record.status,
        risk_assessment_id=record.risk_assessment_id,
        created_at=record.created_at.isoformat() if record.created_at else "",
        updated_at=record.updated_at.isoformat() if record.updated_at else "",
    )
