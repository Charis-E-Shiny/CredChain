"""
FastAPI Router for CredChain Credit Passport System.
Provides endpoints for passport generation, independent on-chain verification,
revocation, PDF download, and borrower history.
"""

from datetime import datetime, timedelta, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.database.models import CreditAssessment, CreditPassport, LoanRecord
from app.schemas.passport_schema import (
    PassportGenerateRequest,
    PassportResponse,
    PassportRevokeRequest,
    PassportVerificationResponse,
)
from app.services.passport_service import (
    FRONTEND_BASE_URL,
    REGISTRY_ADDRESS,
    anchor_passport_on_chain,
    canonicalize_json,
    compute_sha256_hash,
    fetch_on_chain_reputation,
    generate_passport_id,
    generate_passport_pdf,
    revoke_passport_on_chain,
    verify_passport_on_chain,
)

router = APIRouter(prefix="/passport", tags=["Credit Passport"])


def _compute_status(passport: CreditPassport, now_utc: datetime) -> str:
    """Calculate effective status based on revocation and expiration."""
    if passport.revoked:
        return "REVOKED"
    # Ensure timezone aware comparison
    expires_at = passport.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < now_utc:
        return "EXPIRED"
    return "VALID"


def _format_passport_response(passport: CreditPassport, base_url: str) -> PassportResponse:
    now_utc = datetime.now(timezone.utc)
    eff_status = _compute_status(passport, now_utc)

    # Calculate repayment rate
    total = passport.total_loans
    repaid = passport.repaid_loans
    rate = (repaid / total * 100.0) if total > 0 else 100.0

    import json
    canonical_dict = json.loads(passport.canonical_data_json) if passport.canonical_data_json else {}

    return PassportResponse(
        passport_id=passport.passport_id,
        wallet_address=passport.wallet_address,
        reputation_score=passport.reputation_score,
        total_loans=passport.total_loans,
        repaid_loans=passport.repaid_loans,
        defaulted_loans=passport.defaulted_loans,
        total_borrowed=passport.total_borrowed,
        total_repaid=passport.total_repaid,
        on_time_repayment_rate=round(rate, 2),
        risk_category=passport.risk_category,
        confidence=passport.confidence,
        data_hash=passport.data_hash,
        issued_at=passport.issued_at.isoformat() if passport.issued_at else "",
        expires_at=passport.expires_at.isoformat() if passport.expires_at else "",
        revoked=passport.revoked,
        revoked_at=passport.revoked_at.isoformat() if passport.revoked_at else None,
        tx_hash=passport.tx_hash,
        canonical_data=canonical_dict,
        download_url=f"/api/passport/{passport.passport_id}/download",
        verify_url=f"{base_url}/verify/{passport.passport_id}",
        status=eff_status,
    )


@router.post("/generate", response_model=PassportResponse, status_code=status.HTTP_201_CREATED)
def generate_passport(req: PassportGenerateRequest, db: Session = Depends(get_db)):
    """
    Generate an official CredChain Credit Passport for a borrower.
    Aggregates on-chain reputation, loan performance, and consented AI assessment,
    calculates deterministic SHA-256 data hash, and anchors to CreditPassportRegistry.
    """
    wallet = req.wallet_address.lower()
    now_utc = datetime.now(timezone.utc)
    expires_at = now_utc + timedelta(days=req.validity_days)

    # 1. Fetch live on-chain reputation and stats
    score, total_loans, repaid, defaulted, borrowed_cred, repaid_cred = fetch_on_chain_reputation(wallet)

    # Also augment with local DB loan records if present
    db_loans = db.query(LoanRecord).filter(LoanRecord.wallet_address == wallet).all()
    if db_loans and total_loans == 0:
        total_loans = len(db_loans)
        repaid = sum(1 for l in db_loans if l.status == "REPAID")
        defaulted = sum(1 for l in db_loans if l.status == "DEFAULTED")
        borrowed_cred = float(sum(l.amount for l in db_loans))
        repaid_cred = float(sum(l.amount for l in db_loans if l.status == "REPAID"))

    # 2. Fetch latest AI assessment for risk category and confidence
    latest_assessment = (
        db.query(CreditAssessment)
        .filter(CreditAssessment.wallet_address == wallet)
        .order_by(CreditAssessment.created_at.desc())
        .first()
    )
    risk_category = latest_assessment.risk_category if latest_assessment else "LOW"
    confidence = latest_assessment.confidence if latest_assessment else 0.88

    on_time_rate = (repaid / total_loans * 100.0) if total_loans > 0 else 100.0
    passport_id = generate_passport_id()

    # 3. Deterministic Canonical Data Payload
    canonical_data = {
        "ai_confidence": round(confidence, 4),
        "ai_risk_category": risk_category,
        "borrower": wallet,
        "defaulted_loans": defaulted,
        "expires_at": int(expires_at.timestamp()),
        "issued_at": int(now_utc.timestamp()),
        "network": "Anvil Local (Chain ID 31337)",
        "on_time_repayment_rate": round(on_time_rate, 2),
        "passport_id": passport_id.lower(),
        "registry_contract": REGISTRY_ADDRESS.lower(),
        "repaid_loans": repaid,
        "reputation_score": int(score),
        "total_borrowed_cred": round(borrowed_cred, 2),
        "total_loans": total_loans,
        "total_repaid_cred": round(repaid_cred, 2),
    }

    canonical_json_str = canonicalize_json(canonical_data)
    data_hash = compute_sha256_hash(canonical_json_str)

    # 4. Anchor on-chain
    tx_hash = anchor_passport_on_chain(
        passport_id=passport_id,
        borrower_address=wallet,
        data_hash=data_hash,
        valid_until_timestamp=int(expires_at.timestamp()),
    )

    # 5. Persist to Database
    db_passport = CreditPassport(
        passport_id=passport_id.lower(),
        wallet_address=wallet,
        reputation_score=int(score),
        total_loans=total_loans,
        repaid_loans=repaid,
        defaulted_loans=defaulted,
        total_borrowed=borrowed_cred,
        total_repaid=repaid_cred,
        risk_category=risk_category,
        confidence=confidence,
        data_hash=data_hash,
        issued_at=now_utc,
        expires_at=expires_at,
        revoked=False,
        tx_hash=tx_hash,
        canonical_data_json=canonical_json_str,
    )
    db.add(db_passport)
    db.commit()
    db.refresh(db_passport)

    return _format_passport_response(db_passport, FRONTEND_BASE_URL)


@router.get("/{passport_id}", response_model=PassportResponse)
def get_passport_details(passport_id: str, db: Session = Depends(get_db)):
    """Fetch details of a generated credit passport."""
    pid = passport_id.lower()
    passport = db.query(CreditPassport).filter(CreditPassport.passport_id == pid).first()
    if not passport:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Credit passport {passport_id} not found",
        )
    return _format_passport_response(passport, FRONTEND_BASE_URL)


@router.get("/{passport_id}/verify", response_model=PassportVerificationResponse)
def verify_passport(passport_id: str, db: Session = Depends(get_db)):
    """
    Independent public verification endpoint.
    Verifies cryptographic hash consistency and queries the CreditPassportRegistry contract.
    No wallet connection or privileged role required.
    """
    pid = passport_id.lower()
    now_utc = datetime.now(timezone.utc)
    now_iso = now_utc.isoformat()

    passport = db.query(CreditPassport).filter(CreditPassport.passport_id == pid).first()
    if not passport:
        return PassportVerificationResponse(
            passport_id=pid,
            status="NOT_FOUND",
            is_valid=False,
            on_chain_verified=False,
            registry_address=REGISTRY_ADDRESS,
            blockchain_network="Anvil Local (Chain ID: 31337)",
            verification_timestamp=now_iso,
            hash_match=False,
            message="No credit passport record found with this identifier.",
        )

    # 1. Recompute SHA-256 hash from canonical JSON
    computed_hash = compute_sha256_hash(passport.canonical_data_json)
    hash_match = (computed_hash.lower() == passport.data_hash.lower())

    # 2. Check on-chain status
    chain_result = verify_passport_on_chain(pid, passport.data_hash)
    on_chain_valid = chain_result.get("is_valid", False)
    on_chain_status = chain_result.get("status_name", "UNKNOWN")

    # Reconcile status
    final_status = "VALID"
    is_valid = False

    if passport.revoked or on_chain_status == "REVOKED":
        final_status = "REVOKED"
        message = "This credit passport was explicitly revoked by the borrower or authority."
    elif not hash_match:
        final_status = "INVALID"
        message = "Cryptographic integrity failure: canonical data does not match SHA-256 data hash."
    else:
        expires_at = passport.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at < now_utc or on_chain_status == "EXPIRED":
            final_status = "EXPIRED"
            message = "This credit passport has expired and requires borrower renewal."
        elif on_chain_valid or chain_result.get("status_code") == 1:
            final_status = "VALID"
            is_valid = True
            message = "Passport cryptographically verified and confirmed on-chain in CreditPassportRegistry."
        else:
            final_status = "VALID" if hash_match else "INVALID"
            is_valid = hash_match
            message = "Verified using cryptographic data hash reconciliation."

    return PassportVerificationResponse(
        passport_id=pid,
        status=final_status,
        is_valid=is_valid,
        on_chain_verified=chain_result.get("connected", False) and (chain_result.get("status_code") == 1),
        borrower=passport.wallet_address,
        data_hash=passport.data_hash,
        computed_hash=computed_hash,
        hash_match=hash_match,
        issued_at=passport.issued_at.isoformat() if passport.issued_at else None,
        expires_at=passport.expires_at.isoformat() if passport.expires_at else None,
        reputation_score=passport.reputation_score,
        total_loans=passport.total_loans,
        repaid_loans=passport.repaid_loans,
        risk_category=passport.risk_category,
        registry_address=REGISTRY_ADDRESS,
        blockchain_network="Anvil Local (Chain ID: 31337)",
        verification_timestamp=now_iso,
        message=message,
    )


@router.post("/{passport_id}/revoke", response_model=PassportResponse)
def revoke_passport(passport_id: str, req: PassportRevokeRequest, db: Session = Depends(get_db)):
    """
    Revoke a credit passport.
    Only the borrower or authorized issuer can revoke.
    """
    pid = passport_id.lower()
    passport = db.query(CreditPassport).filter(CreditPassport.passport_id == pid).first()
    if not passport:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Credit passport {passport_id} not found",
        )

    if passport.wallet_address.lower() != req.wallet_address.lower():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the borrower wallet that owns this passport can revoke it",
        )

    if passport.revoked:
        return _format_passport_response(passport, FRONTEND_BASE_URL)

    # Revoke on-chain
    revoke_passport_on_chain(pid, req.reason or "Revoked by borrower")

    # Update DB
    passport.revoked = True
    passport.revoked_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(passport)

    return _format_passport_response(passport, FRONTEND_BASE_URL)


@router.get("/{passport_id}/download")
def download_passport_pdf(passport_id: str, db: Session = Depends(get_db)):
    """
    Download a formatted PDF Credit Passport with embedded QR code.
    Suitable for external sharing with off-chain or decentralized lenders.
    """
    pid = passport_id.lower()
    passport = db.query(CreditPassport).filter(CreditPassport.passport_id == pid).first()
    if not passport:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Credit passport {passport_id} not found",
        )

    now_utc = datetime.now(timezone.utc)
    eff_status = _compute_status(passport, now_utc)

    total = passport.total_loans
    repaid = passport.repaid_loans
    rate = (repaid / total * 100.0) if total > 0 else 100.0

    passport_dict = {
        "passport_id": passport.passport_id,
        "wallet_address": passport.wallet_address,
        "reputation_score": passport.reputation_score,
        "total_loans": passport.total_loans,
        "repaid_loans": passport.repaid_loans,
        "defaulted_loans": passport.defaulted_loans,
        "total_borrowed": passport.total_borrowed,
        "total_repaid": passport.total_repaid,
        "on_time_repayment_rate": rate,
        "risk_category": passport.risk_category,
        "confidence": passport.confidence,
        "data_hash": passport.data_hash,
        "issued_at": passport.issued_at.strftime("%Y-%m-%d %H:%M UTC") if passport.issued_at else "N/A",
        "expires_at": passport.expires_at.strftime("%Y-%m-%d %H:%M UTC") if passport.expires_at else "N/A",
        "status": eff_status,
        "tx_hash": passport.tx_hash or "Anchored via Anvil Local",
        "registry_address": REGISTRY_ADDRESS,
    }

    verify_url = f"{FRONTEND_BASE_URL}/verify/{passport.passport_id}"
    pdf_bytes = generate_passport_pdf(passport_dict, verify_url)

    short_id = passport.passport_id[:10]
    filename = f"CredChain_Passport_{short_id}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={filename}",
            "Cache-Control": "no-cache",
        },
    )


@router.get("/borrower/{wallet_address}", response_model=List[PassportResponse])
def get_borrower_passports(wallet_address: str, db: Session = Depends(get_db)):
    """List all credit passports associated with a borrower's wallet address."""
    wallet = wallet_address.lower()
    passports = (
        db.query(CreditPassport)
        .filter(CreditPassport.wallet_address == wallet)
        .order_by(CreditPassport.issued_at.desc())
        .all()
    )
    return [_format_passport_response(p, FRONTEND_BASE_URL) for p in passports]
