"""
FastAPI router for the Borrower Financial Verification Layer.
"""

import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.database.models import BorrowerVerification, VerificationHistory
from app.schemas.verification_schema import (
    AdminReviewItem,
    AdminReviewRequest,
    DiscrepancyReport,
    DocumentUploadResponse,
    ProcessVerificationRequest,
    VerificationHistoryItem,
    VerificationStatusEnum,
    VerificationStatusResponse,
)
from app.services.verification_service import VerificationService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/verification", tags=["Financial Verification"])


@router.post("/upload", response_model=DocumentUploadResponse)
async def upload_verification_document(
    wallet_address: str = Form(...),
    document_type: str = Form("salary_slip"),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """
    Upload supporting financial document (PDF, PNG, JPG, JPEG).
    Validates file format and runs automated text and income extraction.
    """
    if not wallet_address:
        raise HTTPException(status_code=400, detail="Wallet address is required.")

    if not file.filename:
        raise HTTPException(status_code=400, detail="No file selected.")

    # Validate file extension
    ext = file.filename.split(".")[-1].lower()
    if ext not in ["pdf", "png", "jpg", "jpeg"]:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported format .{ext}. Please upload a PDF, PNG, JPG, or JPEG.",
        )

    try:
        doc_record = VerificationService.save_document(
            db=db,
            wallet_address=wallet_address,
            file_obj=file.file,
            original_filename=file.filename,
            document_type=document_type,
        )

        income_msg = (
            f"Extracted Gross: ${doc_record.extracted_gross_income:,.2f}"
            + (f", Net: ${doc_record.extracted_net_income:,.2f}" if doc_record.extracted_net_income else "")
            if doc_record.extracted_gross_income
            else (
                f"Extracted Net: ${doc_record.extracted_net_income:,.2f} (Gross pay required)"
                if doc_record.extracted_net_income
                else "Text extracted; queued for discrepancy comparison."
            )
        )

        return DocumentUploadResponse(
            document_id=doc_record.id,
            file_name=doc_record.file_name,
            file_type=doc_record.file_type,
            file_size_bytes=doc_record.file_size_bytes,
            document_type=doc_record.document_type,
            status=doc_record.status,
            extracted_gross_income=doc_record.extracted_gross_income,
            extracted_net_income=doc_record.extracted_net_income,
            message=f"Document uploaded and processed successfully. {income_msg}",
        )
    except Exception as exc:
        logger.error("Upload processing failed: %s", exc)
        raise HTTPException(status_code=400, detail=str(exc))


@router.delete("/document/{document_id}")
def delete_verification_document(
    document_id: str,
    wallet_address: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """
    Remove an uploaded verification document and re-evaluate verification standing.
    """
    success = VerificationService.delete_document(db, document_id, wallet_address)
    if not success:
        raise HTTPException(status_code=404, detail="Document not found or access denied.")
    return {"message": "Document deleted successfully.", "document_id": document_id}


@router.post("/process", response_model=DiscrepancyReport)
def process_verification(
    request: ProcessVerificationRequest,
    db: Session = Depends(get_db),
):
    """
    Run discrepancy analysis between declared income and extracted evidence.
    Sets verification status: EVIDENCE_CHECKED if within tolerance, MANUAL_REVIEW if discrepancy detected.
    """
    try:
        report = VerificationService.evaluate_verification(
            db=db,
            wallet_address=request.wallet_address,
            declared_annual_income=request.declared_annual_income,
            declared_monthly_debt=request.declared_monthly_debt,
            declared_employment_years=request.declared_employment_years,
            tolerance_percentage=request.tolerance_percentage,
        )
        return report
    except Exception as exc:
        logger.error("Verification processing failed: %s", exc)
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/status/{wallet_address}", response_model=VerificationStatusResponse)
def get_verification_status(
    wallet_address: str,
    db: Session = Depends(get_db),
):
    """
    Get current verification status, extracted figures, and lending route eligibility for a borrower.
    """
    return VerificationService.get_borrower_status(db, wallet_address)


@router.get("/report/{wallet_address}", response_model=VerificationStatusResponse)
def get_verification_report(
    wallet_address: str,
    db: Session = Depends(get_db),
):
    """Alias for full verification report."""
    return VerificationService.get_borrower_status(db, wallet_address)


@router.get("/history/{wallet_address}", response_model=List[VerificationHistoryItem])
def get_verification_history(
    wallet_address: str,
    db: Session = Depends(get_db),
):
    """
    Retrieve audit trail of status transitions for a borrower.
    """
    clean_wallet = wallet_address.lower().strip()
    history = (
        db.query(VerificationHistory)
        .filter(VerificationHistory.wallet_address == clean_wallet)
        .order_by(VerificationHistory.created_at.desc())
        .all()
    )

    return [
        VerificationHistoryItem(
            id=h.id,
            previous_status=h.previous_status,
            new_status=h.new_status,
            changed_by=h.changed_by,
            reason=h.reason,
            record_hash=h.record_hash,
            created_at=h.created_at.isoformat() if h.created_at else "",
        )
        for h in history
    ]


@router.get("/admin/list", response_model=List[AdminReviewItem])
def list_admin_verifications(
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """
    Admin endpoint: List all borrower verification requests with discrepancy indicators.
    """
    query = db.query(BorrowerVerification)
    if status_filter and status_filter.upper() != "ALL":
        query = query.filter(BorrowerVerification.status == status_filter.upper())

    verifications = query.order_by(BorrowerVerification.updated_at.desc()).all()

    items = []
    for v in verifications:
        items.append(
            AdminReviewItem(
                wallet_address=v.wallet_address,
                status=VerificationStatusEnum(v.status),
                declared_annual_income=v.declared_annual_income,
                declared_monthly_income=v.declared_monthly_income,
                extracted_monthly_income=v.extracted_monthly_income,
                discrepancy_percentage=v.discrepancy_percentage,
                requires_manual_review=(v.status == "MANUAL_REVIEW"),
                documents_count=0,
                record_hash=v.record_hash,
                updated_at=v.updated_at.isoformat() if v.updated_at else "",
                verifier_notes=v.verifier_notes,
            )
        )
    return items


@router.post("/admin/review", response_model=VerificationStatusResponse)
def admin_review_verification(
    request: AdminReviewRequest,
    db: Session = Depends(get_db),
):
    """
    Admin/Verifier endpoint: Update verification status, record verifier notes,
    or assign SOURCE_VERIFIED when external trusted attestation is confirmed.
    """
    return VerificationService.admin_review_and_update(
        db=db,
        wallet_address=request.wallet_address,
        target_status=request.target_status,
        notes=request.notes or "",
        verifier_address=request.verifier_address,
        source_verifier_name=request.source_verifier_name,
    )
