"""
API endpoints for borrower profiles.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import httpx
from pydantic import BaseModel

from app.database.connection import get_db
from app.database.models import CreditAssessment, UserProfile
from app.schemas.loan_schema import BorrowerProfile

router = APIRouter(prefix="/borrowers", tags=["Borrowers"])


class EthFaucetRequest(BaseModel):
    wallet_address: str
    amount_eth: float = 1000.0


@router.post("/faucet/eth")
async def fund_wallet_eth(request: EthFaucetRequest):
    """Directly fund any wallet address with local Anvil test ETH."""
    wallet = request.wallet_address.strip()
    if not wallet.startswith("0x") or len(wallet) != 42:
        raise HTTPException(status_code=400, detail="Invalid Ethereum address.")

    # Calculate hex balance in wei (e.g. 1000 ETH = 1000 * 10^18 wei)
    wei_amount = int(request.amount_eth * 1e18)
    hex_wei = hex(wei_amount)

    try:
        async with httpx.AsyncClient() as client:
            rpc_payload = {
                "jsonrpc": "2.0",
                "method": "anvil_setBalance",
                "params": [wallet, hex_wei],
                "id": 1,
            }
            res = await client.post("http://127.0.0.1:8545", json=rpc_payload, timeout=5.0)
            data = res.json()
            if "error" in data:
                raise HTTPException(status_code=500, detail=f"RPC Error: {data['error']}")
            return {
                "status": "success",
                "wallet_address": wallet,
                "funded_eth": request.amount_eth,
                "message": f"Successfully credited {request.amount_eth} ETH to {wallet}.",
            }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to connect to Anvil RPC: {str(exc)}")


@router.get("/{wallet}/profile", response_model=BorrowerProfile)
def get_borrower_profile(wallet: str, db: Session = Depends(get_db)):
    """Get public borrower profile based on wallet address."""
    clean_wallet = wallet.lower()
    profile = db.query(UserProfile).filter(UserProfile.wallet_address == clean_wallet).first()

    # Get most recent assessment if available
    latest_assessment = (
        db.query(CreditAssessment)
        .filter(CreditAssessment.wallet_address == clean_wallet)
        .order_by(CreditAssessment.created_at.desc())
        .first()
    )

    recent_category = latest_assessment.risk_category if latest_assessment else None

    if not profile:
        return BorrowerProfile(
            wallet_address=clean_wallet,
            total_assessments=0,
            member_since="New User",
            recent_risk_category=None,
        )

    return BorrowerProfile(
        wallet_address=profile.wallet_address,
        total_assessments=profile.total_assessments,
        member_since=profile.created_at.strftime("%Y-%m-%d") if profile.created_at else "Unknown",
        recent_risk_category=recent_category,
    )
