"""
Scoring service: applies verification standing to the model's raw risk score,
binds each assessment to a tamper-evident hash, and re-scores a borrower when
their verification standing changes.

The adjustment rules are the same as the ones previously inline in the
credit endpoint. They are kept here as a pure function so that the endpoint,
the re-score path, and the verifier all compute the score the same way.
"""

import hashlib
import json
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from sqlalchemy.orm import Session

from app.database.models import CreditAssessment

HASH_VERSION = "credchain-assessment-v1"


@dataclass(frozen=True)
class StandingResult:
    adjustment: float          # signed delta applied to the raw score (unrounded internally)
    final_risk_score: float    # clamped to [0.02, 0.98], rounded to 4 dp
    confidence: float          # adjusted model confidence (unrounded)
    risk_category: str         # LOW / MEDIUM / HIGH on the final score


def apply_verification_standing(raw_risk_score: float, raw_confidence: float, status: str) -> StandingResult:
    """Apply the verification standing to a raw model output.

    SOURCE_VERIFIED: -15% relative risk, confidence +0.08 (cap 0.98)
    EVIDENCE_CHECKED: -6% relative risk, confidence +0.05 (cap 0.95)
    MANUAL_REVIEW: +15% relative risk plus 0.05, confidence cap 0.70
    UNVERIFIED (and any unknown status): +8% relative risk plus 0.02, confidence cap 0.75
    """
    raw = float(raw_risk_score)
    conf = float(raw_confidence)

    if status == "SOURCE_VERIFIED":
        adjustment = -0.15 * raw
        confidence = min(0.98, conf + 0.08)
    elif status == "EVIDENCE_CHECKED":
        adjustment = -0.06 * raw
        confidence = min(0.95, conf + 0.05)
    elif status == "MANUAL_REVIEW":
        adjustment = 0.15 * raw + 0.05
        confidence = min(0.70, conf)
    else:  # UNVERIFIED, or any status we do not recognise: treat as unverified
        adjustment = 0.08 * raw + 0.02
        confidence = min(0.75, conf)

    final = round(min(0.98, max(0.02, raw + adjustment)), 4)
    if final < 0.35:
        category = "LOW"
    elif final < 0.65:
        category = "MEDIUM"
    else:
        category = "HIGH"

    return StandingResult(
        adjustment=adjustment,
        final_risk_score=final,
        confidence=confidence,
        risk_category=category,
    )


def compute_assessment_hash(record: Dict[str, Any]) -> str:
    """Return the 0x-prefixed SHA-256 (bytes32) of an assessment record.

    The hash covers the inputs, the raw and final scores, the verification
    standing and the verification record it was computed from, the model
    version, and the assessment timestamp. Keys are sorted and numbers are
    rounded so that the same record always hashes to the same value.
    """
    canonical = {
        "version": HASH_VERSION,
        "wallet_address": str(record["wallet_address"]).lower(),
        "features": record["features"],
        "raw_risk_score": round(float(record["raw_risk_score"]), 6),
        "raw_confidence": round(float(record["raw_confidence"]), 6),
        "final_risk_score": round(float(record["final_risk_score"]), 4),
        "confidence": round(float(record["confidence"]), 4),
        "verification_status": str(record["verification_status"]),
        "verification_record_hash": record.get("verification_record_hash") or "",
        "model_version": str(record["model_version"]),
        "assessed_at": str(record["assessed_at"]),
    }
    dumped = json.dumps(canonical, sort_keys=True, separators=(",", ":"))
    return "0x" + hashlib.sha256(dumped.encode("utf-8")).hexdigest()


def _record_from_row(row: CreditAssessment) -> Dict[str, Any]:
    """Rebuild the hashed record from a stored assessment row."""
    return {
        "wallet_address": row.wallet_address,
        "features": json.loads(row.features_json) if row.features_json else {},
        "raw_risk_score": row.raw_risk_score,
        "raw_confidence": row.raw_confidence,
        "final_risk_score": row.risk_score,
        "confidence": row.confidence,
        "verification_status": row.verification_status,
        "verification_record_hash": row.verification_record_hash,
        "model_version": row.model_version,
        "assessed_at": row.assessed_at,
    }


def verify_assessment_row(
    row: CreditAssessment,
    current_status: Optional[str] = None,
    current_record_hash: Optional[str] = None,
    onchain_hash: Optional[str] = None,
) -> Dict[str, Any]:
    """Check a stored assessment against its hash, its score, and current state.

    Returns a dict of independent checks so a failure can be located:
    - hash_matches: stored hash equals the hash recomputed from stored fields
    - score_consistent: stored final score equals the standing applied to the raw score
    - verification_status_current: the borrower's status has not changed since assessment
    - verification_record_current: the verification record has not changed since assessment
    - matches_onchain: the on-chain riskAssessmentHash equals the stored hash (if given)
    """
    if row.assessment_hash is None or row.raw_risk_score is None:
        return {"valid": False, "reason": "assessment predates integrity fields and cannot be verified"}

    recomputed = compute_assessment_hash(_record_from_row(row))
    hash_matches = recomputed == row.assessment_hash

    expected = apply_verification_standing(row.raw_risk_score, row.raw_confidence, row.verification_status)
    score_consistent = abs(expected.final_risk_score - row.risk_score) < 1e-9

    checks = {
        "hash_matches": hash_matches,
        "score_consistent": score_consistent,
        "verification_status_current": (current_status is None) or (current_status == row.verification_status),
        "verification_record_current": (current_record_hash is None)
        or ((current_record_hash or "") == (row.verification_record_hash or "")),
    }
    if onchain_hash is not None:
        checks["matches_onchain"] = onchain_hash.lower() == row.assessment_hash.lower()

    # Integrity (hash and score) is what the verify endpoint promises. Staleness is reported
    # separately so a valid-but-outdated assessment is distinguishable from a tampered one.
    integrity_ok = hash_matches and score_consistent
    if "matches_onchain" in checks:
        integrity_ok = integrity_ok and checks["matches_onchain"]

    return {
        "valid": integrity_ok,
        "stale": not (checks["verification_status_current"] and checks["verification_record_current"]),
        "checks": checks,
        "assessment_hash": row.assessment_hash,
        "recomputed_hash": recomputed,
    }


def rescore_wallet(
    db: Session,
    wallet_address: str,
    current_status: str,
    current_record_hash: Optional[str],
) -> Optional[CreditAssessment]:
    """Create a new assessment reflecting the borrower's current verification standing.

    Called after a verification status changes. It re-applies the standing to the
    most recent raw score and writes a new, append-only assessment row. The old row
    is kept as history. Returns None if there is no prior assessment with integrity
    fields, or if the standing is unchanged.
    """
    wallet = wallet_address.lower().strip()
    db.flush()  # the session has autoflush disabled; make pending verification changes visible

    latest = (
        db.query(CreditAssessment)
        .filter(CreditAssessment.wallet_address == wallet, CreditAssessment.raw_risk_score.isnot(None))
        .order_by(CreditAssessment.created_at.desc())
        .first()
    )
    if latest is None:
        return None

    if latest.verification_status == current_status and (latest.verification_record_hash or "") == (current_record_hash or ""):
        return None

    result = apply_verification_standing(latest.raw_risk_score, latest.raw_confidence, current_status)
    now = datetime.now(timezone.utc)
    record = {
        "wallet_address": wallet,
        "features": json.loads(latest.features_json) if latest.features_json else {},
        "raw_risk_score": latest.raw_risk_score,
        "raw_confidence": latest.raw_confidence,
        "final_risk_score": result.final_risk_score,
        "confidence": result.confidence,
        "verification_status": current_status,
        "verification_record_hash": current_record_hash,
        "model_version": latest.model_version,
        "assessed_at": now.isoformat(),
    }
    new_row = CreditAssessment(
        wallet_address=wallet,
        risk_score=result.final_risk_score,
        risk_category=result.risk_category,
        confidence=round(result.confidence, 4),
        features_json=latest.features_json,
        model_version=latest.model_version,
        consent_given=latest.consent_given,
        raw_risk_score=latest.raw_risk_score,
        raw_confidence=latest.raw_confidence,
        verification_status=current_status,
        verification_record_hash=current_record_hash,
        verification_adjustment=round(result.adjustment, 4),
        assessed_at=record["assessed_at"],
        assessment_hash=compute_assessment_hash(record),
        created_at=now,
    )
    db.add(new_row)
    return new_row
