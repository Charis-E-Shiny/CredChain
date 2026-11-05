"""
Borrower Financial Verification Layer evaluation and rule-based status engine.
"""

import hashlib
import json
import logging
import os
import shutil
import uuid
from datetime import datetime, timezone
from typing import List, Optional, Tuple

from sqlalchemy.orm import Session

from app.database.models import BorrowerVerification, VerificationDocument, VerificationHistory
from app.schemas.verification_schema import (
    DiscrepancyReport,
    DocumentItem,
    VerificationStatusEnum,
    VerificationStatusResponse,
)
from app.services.document_processing import DocumentProcessor

logger = logging.getLogger(__name__)

# Base upload directory
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads", "verification")
os.makedirs(UPLOAD_DIR, exist_ok=True)


def _canonical_record_hash(
    wallet_address: str,
    status: str,
    declared_monthly: float,
    extracted_monthly: float,
    discrepancy: float,
    timestamp: str,
) -> str:
    """Generate deterministic sha256 bytes32 hex hash representing the canonical verification record."""
    canonical_payload = {
        "wallet_address": wallet_address.lower(),
        "status": status,
        "declared_monthly_income": round(declared_monthly, 2),
        "extracted_monthly_income": round(extracted_monthly, 2),
        "discrepancy_percentage": round(discrepancy, 2),
        "timestamp": timestamp,
    }
    dumped = json.dumps(canonical_payload, sort_keys=True)
    digest = hashlib.sha256(dumped.encode("utf-8")).hexdigest()
    return "0x" + digest


class VerificationService:
    """Manages borrower verification records, uploads, extraction, and discrepancy evaluation."""

    @classmethod
    def save_document(
        cls,
        db: Session,
        wallet_address: str,
        file_obj,
        original_filename: str,
        document_type: str = "salary_slip",
    ) -> VerificationDocument:
        """Securely store an uploaded document and run extraction."""
        clean_wallet = wallet_address.lower().strip()
        wallet_folder = os.path.join(UPLOAD_DIR, clean_wallet)
        os.makedirs(wallet_folder, exist_ok=True)

        ext = os.path.splitext(original_filename)[1].lower().replace(".", "")
        if ext not in ["pdf", "png", "jpg", "jpeg"]:
            raise ValueError(f"Unsupported file format: {ext}. Supported formats: PDF, PNG, JPG, JPEG.")

        doc_id = str(uuid.uuid4())
        safe_filename = f"{doc_id}.{ext}"
        target_path = os.path.join(wallet_folder, safe_filename)

        # Save file to disk
        file_obj.seek(0)
        with open(target_path, "wb") as buffer:
            shutil.copyfileobj(file_obj, buffer)

        file_size = os.path.getsize(target_path)
        if file_size > 10 * 1024 * 1024:  # 10 MB limit
            os.remove(target_path)
            raise ValueError("File exceeds maximum allowed limit of 10 MB.")

        # Process and extract financial figures
        extracted_text, extracted_income, detected_credits, confidence = DocumentProcessor.process_file(
            target_path, ext
        )

        initial_status = "EVIDENCE_CHECKED" if extracted_income is not None else "MANUAL_REVIEW"

        doc_record = VerificationDocument(
            id=doc_id,
            wallet_address=clean_wallet,
            file_name=original_filename,
            stored_path=target_path,
            file_type=ext,
            file_size_bytes=file_size,
            document_type=document_type,
            extracted_text=extracted_text[:2000] if extracted_text else "",
            extracted_income=extracted_income,
            extracted_metadata_json=json.dumps({"detected_credits": detected_credits}),
            extraction_confidence=confidence,
            status=initial_status,
        )
        db.add(doc_record)
        db.commit()
        db.refresh(doc_record)

        return doc_record

    @classmethod
    def delete_document(
        cls,
        db: Session,
        document_id: str,
        wallet_address: Optional[str] = None,
    ) -> bool:
        """Securely remove an uploaded document, delete file from disk, and adjust verification standing."""
        query = db.query(VerificationDocument).filter(VerificationDocument.id == document_id)
        if wallet_address:
            clean_wallet = wallet_address.lower().strip()
            query = query.filter(VerificationDocument.wallet_address == clean_wallet)
        doc = query.first()
        if not doc:
            return False

        clean_wallet = doc.wallet_address
        stored_path = doc.stored_path
        filename = doc.file_name

        # Remove physical file if exists
        try:
            if stored_path and os.path.exists(stored_path):
                os.remove(stored_path)
        except Exception as e:
            logger.warning("Could not delete stored file %s: %s", stored_path, e)

        # Remove doc record from DB
        db.delete(doc)
        db.commit()

        # Check remaining documents
        remaining_docs = (
            db.query(VerificationDocument)
            .filter(VerificationDocument.wallet_address == clean_wallet)
            .all()
        )

        bv = (
            db.query(BorrowerVerification)
            .filter(BorrowerVerification.wallet_address == clean_wallet)
            .first()
        )

        if bv:
            if not remaining_docs:
                # Reset to UNVERIFIED if no documents left (unless SOURCE_VERIFIED by admin)
                if bv.status != VerificationStatusEnum.SOURCE_VERIFIED.value:
                    bv.status = VerificationStatusEnum.UNVERIFIED.value
                    bv.extracted_monthly_income = 0.0
                    bv.discrepancy_percentage = 0.0
                    bv.verifier_notes = "All evidence documents removed. Verification reset to UNVERIFIED."
                    now_iso = datetime.now(timezone.utc).isoformat()
                    bv.record_hash = _canonical_record_hash(clean_wallet, bv.status, bv.declared_monthly_income, 0.0, 0.0, now_iso)
            else:
                # Re-evaluate with remaining documents if not SOURCE_VERIFIED
                if bv.status != VerificationStatusEnum.SOURCE_VERIFIED.value:
                    cls.evaluate_verification(
                        db=db,
                        wallet_address=clean_wallet,
                        declared_annual_income=bv.declared_annual_income or 75000,
                        declared_monthly_debt=bv.declared_monthly_debt or 0,
                        declared_employment_years=bv.declared_employment_years or 0,
                    )

            hist = VerificationHistory(
                wallet_address=clean_wallet,
                previous_status=bv.status,
                new_status=bv.status,
                changed_by="borrower:delete_document",
                reason=f"Removed document {filename}",
                record_hash=bv.record_hash,
            )
            db.add(hist)
            db.commit()

        return True

    @classmethod
    def evaluate_verification(
        cls,
        db: Session,
        wallet_address: str,
        declared_annual_income: float,
        declared_monthly_debt: float = 0.0,
        declared_employment_years: float = 0.0,
        tolerance_percentage: float = 5.0,
    ) -> DiscrepancyReport:
        """
        Compare declared income with extracted evidence values.
        Applies tolerance threshold to determine verification status.
        """
        clean_wallet = wallet_address.lower().strip()
        declared_monthly = declared_annual_income / 12.0

        # Retrieve all uploaded documents for this borrower
        docs: List[VerificationDocument] = (
            db.query(VerificationDocument)
            .filter(VerificationDocument.wallet_address == clean_wallet)
            .all()
        )

        all_detected_credits = []
        for d in docs:
            if d.extracted_income:
                all_detected_credits.append(d.extracted_income)

        if not docs:
            # No documents submitted
            status = VerificationStatusEnum.UNVERIFIED
            explanation = "No supporting financial evidence uploaded yet. Self-declared figures only."
            extracted_monthly = 0.0
            discrepancy = 100.0
            is_within_tol = False
            requires_manual = False
        elif not all_detected_credits:
            # Documents uploaded but extraction failed to find reliable values
            status = VerificationStatusEnum.MANUAL_REVIEW
            explanation = "Document text extraction could not detect clear income figures. Requires manual verification."
            extracted_monthly = 0.0
            discrepancy = 100.0
            is_within_tol = False
            requires_manual = True
        else:
            # Average of detected income credits across evidence
            extracted_monthly = sum(all_detected_credits) / len(all_detected_credits)
            discrepancy = (abs(declared_monthly - extracted_monthly) / declared_monthly) * 100.0

            if discrepancy <= tolerance_percentage:
                status = VerificationStatusEnum.EVIDENCE_CHECKED
                explanation = (
                    f"Evidence matched. Extracted income (₹{extracted_monthly:,.2f}/mo) aligns with declared "
                    f"income (₹{declared_monthly:,.2f}/mo) within configured {tolerance_percentage}% tolerance "
                    f"({discrepancy:.2f}% variance)."
                )
                is_within_tol = True
                requires_manual = False
            else:
                status = VerificationStatusEnum.MANUAL_REVIEW
                explanation = (
                    f"Discrepancy detected: Declared ₹{declared_monthly:,.2f}/mo vs extracted evidence "
                    f"₹{extracted_monthly:,.2f}/mo ({discrepancy:.2f}% variance exceeds {tolerance_percentage}% tolerance). "
                    f"Sent for manual review."
                )
                is_within_tol = False
                requires_manual = True

        # Timestamp for canonical hash
        now_iso = datetime.now(timezone.utc).isoformat()
        rec_hash = _canonical_record_hash(
            clean_wallet,
            status.value,
            declared_monthly,
            extracted_monthly,
            discrepancy,
            now_iso,
        )

        # Update or create BorrowerVerification record
        bv: Optional[BorrowerVerification] = (
            db.query(BorrowerVerification)
            .filter(BorrowerVerification.wallet_address == clean_wallet)
            .first()
        )

        prev_status = bv.status if bv else "UNVERIFIED"

        if not bv:
            bv = BorrowerVerification(
                wallet_address=clean_wallet,
                declared_annual_income=declared_annual_income,
                declared_monthly_income=round(declared_monthly, 2),
                declared_monthly_debt=declared_monthly_debt,
                declared_employment_years=declared_employment_years,
                extracted_monthly_income=round(extracted_monthly, 2),
                discrepancy_percentage=round(discrepancy, 2),
                status=status.value,
                record_hash=rec_hash,
                verifier_notes=explanation,
            )
            db.add(bv)
        else:
            # If already SOURCE_VERIFIED by admin, preserve it unless explicitly overwritten
            if bv.status == VerificationStatusEnum.SOURCE_VERIFIED.value:
                status = VerificationStatusEnum.SOURCE_VERIFIED
            else:
                bv.status = status.value
            bv.declared_annual_income = declared_annual_income
            bv.declared_monthly_income = round(declared_monthly, 2)
            bv.declared_monthly_debt = declared_monthly_debt
            bv.declared_employment_years = declared_employment_years
            bv.extracted_monthly_income = round(extracted_monthly, 2)
            bv.discrepancy_percentage = round(discrepancy, 2)
            bv.record_hash = rec_hash
            bv.verifier_notes = explanation

        # Audit trail history
        history = VerificationHistory(
            wallet_address=clean_wallet,
            previous_status=prev_status,
            new_status=status.value,
            changed_by="system:rules_engine",
            reason=explanation,
            record_hash=rec_hash,
        )
        db.add(history)
        db.commit()

        return DiscrepancyReport(
            declared_annual_income=round(declared_annual_income, 2),
            declared_monthly_income=round(declared_monthly, 2),
            extracted_monthly_income=round(extracted_monthly, 2),
            discrepancy_percentage=round(discrepancy, 2),
            tolerance_percentage=tolerance_percentage,
            is_within_tolerance=is_within_tol,
            status=status,
            explanation=explanation,
            detected_credits=[round(c, 2) for c in all_detected_credits],
            requires_manual_review=requires_manual,
            record_hash=rec_hash,
        )

    @classmethod
    def get_borrower_status(cls, db: Session, wallet_address: str) -> VerificationStatusResponse:
        """Fetch current verification summary for a given wallet address."""
        clean_wallet = wallet_address.lower().strip()

        bv: Optional[BorrowerVerification] = (
            db.query(BorrowerVerification)
            .filter(BorrowerVerification.wallet_address == clean_wallet)
            .first()
        )

        docs: List[VerificationDocument] = (
            db.query(VerificationDocument)
            .filter(VerificationDocument.wallet_address == clean_wallet)
            .order_by(VerificationDocument.upload_timestamp.desc())
            .all()
        )

        doc_items = [
            DocumentItem(
                id=d.id,
                file_name=d.file_name,
                file_type=d.file_type,
                file_size_bytes=d.file_size_bytes,
                document_type=d.document_type,
                upload_timestamp=d.upload_timestamp.isoformat() if d.upload_timestamp else "",
                status=d.status,
                extracted_income=d.extracted_income,
                extraction_confidence=d.extraction_confidence,
            )
            for d in docs
        ]

        if not bv:
            # Default unverified profile
            return VerificationStatusResponse(
                wallet_address=clean_wallet,
                status=VerificationStatusEnum.UNVERIFIED,
                declared_annual_income=0.0,
                declared_monthly_income=0.0,
                declared_monthly_debt=0.0,
                declared_employment_years=0.0,
                extracted_monthly_income=0.0,
                discrepancy_percentage=0.0,
                tolerance_percentage=5.0,
                record_hash=None,
                verifier_notes="No financial verification submitted yet.",
                verifier_address=None,
                source_verifier_name=None,
                on_chain_tx_hash=None,
                documents=doc_items,
                updated_at=datetime.now(timezone.utc).isoformat(),
                can_proceed_standard_lending=False,
                lending_route="UNVERIFIED_RESTRICTED",
            )

        status_enum = VerificationStatusEnum(bv.status)
        can_proceed = status_enum in [VerificationStatusEnum.EVIDENCE_CHECKED, VerificationStatusEnum.SOURCE_VERIFIED]

        lending_route = (
            "SOURCE_VERIFIED"
            if status_enum == VerificationStatusEnum.SOURCE_VERIFIED
            else "STANDARD_VERIFIED"
            if status_enum == VerificationStatusEnum.EVIDENCE_CHECKED
            else "MANUAL_REVIEW_REQUIRED"
            if status_enum == VerificationStatusEnum.MANUAL_REVIEW
            else "UNVERIFIED_RESTRICTED"
        )

        return VerificationStatusResponse(
            wallet_address=clean_wallet,
            status=status_enum,
            declared_annual_income=bv.declared_annual_income,
            declared_monthly_income=bv.declared_monthly_income,
            declared_monthly_debt=bv.declared_monthly_debt,
            declared_employment_years=bv.declared_employment_years,
            extracted_monthly_income=bv.extracted_monthly_income,
            discrepancy_percentage=bv.discrepancy_percentage,
            tolerance_percentage=5.0,
            record_hash=bv.record_hash,
            verifier_notes=bv.verifier_notes,
            verifier_address=bv.verifier_address,
            source_verifier_name=bv.source_verifier_name,
            on_chain_tx_hash=bv.on_chain_tx_hash,
            documents=doc_items,
            updated_at=bv.updated_at.isoformat() if bv.updated_at else datetime.now(timezone.utc).isoformat(),
            can_proceed_standard_lending=can_proceed,
            lending_route=lending_route,
        )

    @classmethod
    def admin_review_and_update(
        cls,
        db: Session,
        wallet_address: str,
        target_status: VerificationStatusEnum,
        notes: str = "",
        verifier_address: Optional[str] = None,
        source_verifier_name: Optional[str] = None,
    ) -> VerificationStatusResponse:
        """Admin or authorized verifier manual review override."""
        clean_wallet = wallet_address.lower().strip()

        bv: Optional[BorrowerVerification] = (
            db.query(BorrowerVerification)
            .filter(BorrowerVerification.wallet_address == clean_wallet)
            .first()
        )

        prev_status = bv.status if bv else "UNVERIFIED"
        now_iso = datetime.now(timezone.utc).isoformat()

        rec_hash = _canonical_record_hash(
            clean_wallet,
            target_status.value,
            bv.declared_monthly_income if bv else 0.0,
            bv.extracted_monthly_income if bv else 0.0,
            bv.discrepancy_percentage if bv else 0.0,
            now_iso,
        )

        if not bv:
            bv = BorrowerVerification(
                wallet_address=clean_wallet,
                status=target_status.value,
                record_hash=rec_hash,
                verifier_notes=notes,
                verifier_address=verifier_address or "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
                source_verifier_name=source_verifier_name or ("Mock Bank API Verifier" if target_status == VerificationStatusEnum.SOURCE_VERIFIED else None),
            )
            db.add(bv)
        else:
            bv.status = target_status.value
            bv.record_hash = rec_hash
            bv.verifier_notes = notes or bv.verifier_notes
            bv.verifier_address = verifier_address or "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
            if target_status == VerificationStatusEnum.SOURCE_VERIFIED:
                bv.source_verifier_name = source_verifier_name or "Mock Trusted Institutional Verifier"

        # Record history
        history = VerificationHistory(
            wallet_address=clean_wallet,
            previous_status=prev_status,
            new_status=target_status.value,
            changed_by=f"verifier:{verifier_address or 'admin'}",
            reason=notes or f"Manual review attestation to {target_status.value}",
            record_hash=rec_hash,
        )
        db.add(history)
        db.commit()

        return cls.get_borrower_status(db, clean_wallet)
