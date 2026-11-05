"""
CredChain Credit Passport Service.
Handles canonical serialization, SHA-256 hashing, smart contract anchoring on Anvil/Ethereum,
and professional PDF passport generation with embedded verification QR code.
"""

import hashlib
import io
import json
import logging
import os
import secrets
from datetime import datetime, timezone
from typing import Any, Dict, Optional, Tuple

import qrcode
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import HRFlowable, Image, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from web3 import Web3

logger = logging.getLogger("credchain.passport")

# Network and Registry configurations
RPC_URL = os.getenv("RPC_URL", "http://127.0.0.1:8545")
REGISTRY_ADDRESS = os.getenv("CREDIT_PASSPORT_REGISTRY_ADDRESS", "0x7a2088a1bFc9d81c55368AE168C2C02570cB814F")
REPUTATION_ADDRESS = os.getenv("BORROWER_REPUTATION_ADDRESS", "0x59b670e9fA9D0A427751Af201D676719a970857b")
DEFAULT_ISSUER_KEY = os.getenv("ISSUER_PRIVATE_KEY", "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80")
FRONTEND_BASE_URL = os.getenv("FRONTEND_BASE_URL", "http://localhost:3000")

# Load Contract ABIs
def _load_abi(rel_path: str) -> list:
    base = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    full_path = os.path.join(base, rel_path)
    if os.path.exists(full_path):
        try:
            with open(full_path, "r") as f:
                return json.load(f).get("abi", [])
        except Exception as e:
            logger.warning("Failed loading ABI from %s: %s", full_path, e)
    return []


REGISTRY_ABI = _load_abi("../blockchain/out/CreditPassportRegistry.sol/CreditPassportRegistry.json")
REPUTATION_ABI = _load_abi("../blockchain/out/BorrowerReputation.sol/BorrowerReputation.json")


def get_web3_client() -> Web3:
    """Return a Web3 instance connected to configured RPC provider."""
    return Web3(Web3.HTTPProvider(RPC_URL))


def canonicalize_json(data: Dict[str, Any]) -> str:
    """
    Deterministically serialize passport data:
    - Keys sorted alphabetically
    - Compact separators (no extra whitespace)
    - UTF-8 string encoding
    """
    return json.dumps(data, sort_keys=True, separators=(",", ":"))


def compute_sha256_hash(canonical_str: str) -> str:
    """
    Compute standard SHA-256 hash of canonical UTF-8 bytes.
    Returns 0x-prefixed 64 hex characters (32 bytes).
    Matches Solidity's sha256() and bytes32 format.
    """
    digest = hashlib.sha256(canonical_str.encode("utf-8")).hexdigest()
    return f"0x{digest}"


def generate_passport_id() -> str:
    """Generate a unique 32-byte identifier for a new credit passport."""
    return f"0x{secrets.token_hex(32)}"


def fetch_on_chain_reputation(wallet_address: str) -> Tuple[int, int, int, int, float, float]:
    """
    Query BorrowerReputation.sol on-chain for live borrower statistics.
    Returns: (reputation_score, total_loans, repaid_loans, defaulted_loans, total_borrowed, total_repaid)
    """
    try:
        w3 = get_web3_client()
        if not w3.is_connected() or not REPUTATION_ABI:
            return (50, 0, 0, 0, 0.0, 0.0)

        contract = w3.eth.contract(
            address=Web3.to_checksum_address(REPUTATION_ADDRESS),
            abi=REPUTATION_ABI,
        )
        checksum_borrower = Web3.to_checksum_address(wallet_address)
        score = contract.functions.getReputationScore(checksum_borrower).call()
        rep_data = contract.functions.getReputation(checksum_borrower).call()
        # struct ReputationRecord: totalLoans, repaidLoans, defaultedLoans, totalBorrowed, totalRepaid, lastActivityTimestamp
        total_loans = rep_data[0]
        repaid_loans = rep_data[1]
        defaulted_loans = rep_data[2]
        total_borrowed = float(rep_data[3]) / 1e18
        total_repaid = float(rep_data[4]) / 1e18

        return (score, total_loans, repaid_loans, defaulted_loans, total_borrowed, total_repaid)
    except Exception as e:
        logger.warning("Error fetching on-chain reputation for %s: %s", wallet_address, e)
        return (50, 0, 0, 0, 0.0, 0.0)


def anchor_passport_on_chain(
    passport_id: str,
    borrower_address: str,
    data_hash: str,
    valid_until_timestamp: int,
) -> Optional[str]:
    """
    Submits registerPassport() transaction to CreditPassportRegistry.sol.
    Returns the transaction hash or None if offline.
    """
    try:
        w3 = get_web3_client()
        if not w3.is_connected() or not REGISTRY_ABI:
            logger.warning("Web3 not connected or missing REGISTRY_ABI; skipping on-chain anchor.")
            return None

        contract = w3.eth.contract(
            address=Web3.to_checksum_address(REGISTRY_ADDRESS),
            abi=REGISTRY_ABI,
        )
        issuer_account = w3.eth.account.from_key(DEFAULT_ISSUER_KEY)
        nonce = w3.eth.get_transaction_count(issuer_account.address)

        passport_id_bytes = bytes.fromhex(passport_id[2:] if passport_id.startswith("0x") else passport_id)
        data_hash_bytes = bytes.fromhex(data_hash[2:] if data_hash.startswith("0x") else data_hash)
        borrower_checksum = Web3.to_checksum_address(borrower_address)

        tx = contract.functions.registerPassport(
            passport_id_bytes,
            borrower_checksum,
            data_hash_bytes,
            valid_until_timestamp,
        ).build_transaction({
            "from": issuer_account.address,
            "nonce": nonce,
            "gas": 350000,
            "gasPrice": w3.eth.gas_price,
        })

        signed = w3.eth.account.sign_transaction(tx, private_key=DEFAULT_ISSUER_KEY)
        tx_hash_bytes = w3.eth.send_raw_transaction(signed.raw_transaction)
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash_bytes, timeout=15)

        if receipt.status == 1:
            tx_hash_hex = receipt.transactionHash.hex()
            logger.info("Successfully registered passport %s on-chain (tx: %s)", passport_id, tx_hash_hex)
            return tx_hash_hex
        else:
            logger.error("On-chain registration failed with status 0 for passport %s", passport_id)
            return None
    except Exception as e:
        logger.error("Failed to anchor passport %s on-chain: %s", passport_id, e)
        return None


def verify_passport_on_chain(passport_id: str, data_hash: str) -> Dict[str, Any]:
    """
    Calls verifyPassport(passportId, dataHash) and getPassport(passportId)
    on CreditPassportRegistry.sol.
    """
    try:
        w3 = get_web3_client()
        if not w3.is_connected() or not REGISTRY_ABI:
            return {
                "connected": False,
                "is_valid": False,
                "status_code": 0,
                "status_name": "UNREACHABLE",
                "borrower": None,
                "registered_hash": None,
                "valid_until": 0,
                "revoked": False,
            }

        contract = w3.eth.contract(
            address=Web3.to_checksum_address(REGISTRY_ADDRESS),
            abi=REGISTRY_ABI,
        )

        passport_id_bytes = bytes.fromhex(passport_id[2:] if passport_id.startswith("0x") else passport_id)
        data_hash_bytes = bytes.fromhex(data_hash[2:] if data_hash.startswith("0x") else data_hash)

        # verifyPassport returns (bool isValid, PassportStatus status)
        is_valid, status_code = contract.functions.verifyPassport(
            passport_id_bytes,
            data_hash_bytes,
        ).call()

        status_names = {0: "NONE", 1: "VALID", 2: "REVOKED", 3: "EXPIRED"}
        status_name = status_names.get(status_code, "UNKNOWN")

        # getPassport returns (dataHash, borrower, issuedAt, validUntil, revoked, version)
        record = contract.functions.getPassport(passport_id_bytes).call()
        registered_hash = f"0x{record[0].hex()}"
        borrower = record[1]
        issued_at = record[2]
        valid_until = record[3]
        revoked = record[4]

        return {
            "connected": True,
            "is_valid": is_valid,
            "status_code": status_code,
            "status_name": status_name,
            "borrower": borrower,
            "registered_hash": registered_hash,
            "issued_at": issued_at,
            "valid_until": valid_until,
            "revoked": revoked,
        }
    except Exception as e:
        logger.error("Error verifying passport %s on-chain: %s", passport_id, e)
        return {
            "connected": False,
            "is_valid": False,
            "status_code": 0,
            "status_name": "ERROR",
            "error": str(e),
        }


def revoke_passport_on_chain(passport_id: str, reason: str = "Revoked by borrower") -> Optional[str]:
    """
    Submits revokePassport() transaction to CreditPassportRegistry.sol.
    """
    try:
        w3 = get_web3_client()
        if not w3.is_connected() or not REGISTRY_ABI:
            logger.warning("Web3 not connected; skipping on-chain revocation.")
            return None

        contract = w3.eth.contract(
            address=Web3.to_checksum_address(REGISTRY_ADDRESS),
            abi=REGISTRY_ABI,
        )
        issuer_account = w3.eth.account.from_key(DEFAULT_ISSUER_KEY)
        nonce = w3.eth.get_transaction_count(issuer_account.address)

        passport_id_bytes = bytes.fromhex(passport_id[2:] if passport_id.startswith("0x") else passport_id)

        tx = contract.functions.revokePassport(
            passport_id_bytes,
            reason,
        ).build_transaction({
            "from": issuer_account.address,
            "nonce": nonce,
            "gas": 250000,
            "gasPrice": w3.eth.gas_price,
        })

        signed = w3.eth.account.sign_transaction(tx, private_key=DEFAULT_ISSUER_KEY)
        tx_hash_bytes = w3.eth.send_raw_transaction(signed.raw_transaction)
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash_bytes, timeout=15)

        if receipt.status == 1:
            return receipt.transactionHash.hex()
        return None
    except Exception as e:
        logger.error("Failed to revoke passport on-chain: %s", e)
        return None


def generate_passport_pdf(passport_dict: Dict[str, Any], verify_url: str) -> bytes:
    """
    Generates a clean, professional, publication-ready Credit Passport PDF with:
    - Official CredChain branding header
    - QR Code linked to unauthenticated public verification page
    - Reputation score badge & loan performance statistics
    - AI risk classification and off-chain disclaimer
    - Cryptographic verification snapshot (registry contract, SHA-256 data hash)
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36,
    )

    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        "DocTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=20,
        leading=24,
        textColor=colors.HexColor("#0F172A"),
    )
    subtitle_style = ParagraphStyle(
        "DocSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#64748B"),
    )
    section_heading = ParagraphStyle(
        "SectionHeading",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=16,
        textColor=colors.HexColor("#1E293B"),
    )
    body_text = ParagraphStyle(
        "BodyStyle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#334155"),
    )
    mono_style = ParagraphStyle(
        "MonoStyle",
        parent=styles["Normal"],
        fontName="Courier",
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#0F172A"),
    )
    disclaimer_style = ParagraphStyle(
        "Disclaimer",
        parent=styles["Normal"],
        fontName="Helvetica-Oblique",
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor("#64748B"),
    )

    story = []

    # 1. Header Banner
    header_data = [
        [
            Paragraph("<b>CREDCHAIN</b> &bull; FINANCIAL PASSPORT", title_style),
            Paragraph(f"<b>STATUS:</b> <font color='#059669'><b>{passport_dict.get('status', 'VALID')}</b></font>", ParagraphStyle(
                "StatusRight",
                parent=styles["Normal"],
                fontName="Helvetica-Bold",
                fontSize=11,
                alignment=2,
                textColor=colors.HexColor("#059669") if passport_dict.get('status') == 'VALID' else colors.HexColor("#DC2626")
            ))
        ],
        [
            Paragraph("Autonomous Decentralized Credit Scoring & Micro-Lending Protocol", subtitle_style),
            Paragraph(f"Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}", ParagraphStyle(
                "DateRight",
                parent=styles["Normal"],
                fontName="Helvetica",
                fontSize=8.5,
                alignment=2,
                textColor=colors.HexColor("#64748B")
            ))
        ]
    ]
    header_table = Table(header_data, colWidths=[360, 180])
    header_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 8))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#0EA5E9"), spaceAfter=14))

    # 2. Borrower Overview Table
    borrower_wallet = passport_dict.get("wallet_address", "")
    passport_id = passport_dict.get("passport_id", "")
    issued_at = passport_dict.get("issued_at", "")
    expires_at = passport_dict.get("expires_at", "")

    overview_data = [
        [Paragraph("<b>Borrower Wallet:</b>", body_text), Paragraph(borrower_wallet, mono_style)],
        [Paragraph("<b>Passport ID:</b>", body_text), Paragraph(passport_id, mono_style)],
        [Paragraph("<b>Issuance Date:</b>", body_text), Paragraph(str(issued_at), body_text)],
        [Paragraph("<b>Valid Until:</b>", body_text), Paragraph(str(expires_at), body_text)],
    ]
    overview_table = Table(overview_data, colWidths=[120, 420])
    overview_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
        ("PADDING", (0, 0), (-1, -1), 5),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story.append(overview_table)
    story.append(Spacer(1, 14))

    # 3. Two-Column Metrics: On-chain stats & QR Code
    # Generate QR Code image in memory
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=4,
        border=2,
    )
    qr.add_data(verify_url)
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color="#0F172A", back_color="white")

    qr_buffer = io.BytesIO()
    qr_img.save(qr_buffer, format="PNG")
    qr_buffer.seek(0)
    report_qr = Image(qr_buffer, width=105, height=105)

    rep_score = passport_dict.get("reputation_score", 50)
    total_loans = passport_dict.get("total_loans", 0)
    repaid_loans = passport_dict.get("repaid_loans", 0)
    defaulted_loans = passport_dict.get("defaulted_loans", 0)
    total_borrowed = passport_dict.get("total_borrowed", 0.0)
    total_repaid = passport_dict.get("total_repaid", 0.0)
    rate = passport_dict.get("on_time_repayment_rate", 100.0)

    # Column Left: Performance Grid
    stats_data = [
        [Paragraph("<b>CredChain Reputation Score:</b>", body_text), Paragraph(f"<b><font size=13 color='#0284C7'>{rep_score}</font> / 100</b>", body_text)],
        [Paragraph("<b>Total Loans Originated:</b>", body_text), Paragraph(str(total_loans), body_text)],
        [Paragraph("<b>Loans Repaid in Full:</b>", body_text), Paragraph(f"<font color='#059669'>{repaid_loans}</font>", body_text)],
        [Paragraph("<b>Defaulted Loans:</b>", body_text), Paragraph(f"<font color='#DC2626'>{defaulted_loans}</font>", body_text)],
        [Paragraph("<b>Repayment Success Rate:</b>", body_text), Paragraph(f"<b>{rate:.1f}%</b>", body_text)],
        [Paragraph("<b>Total Amount Borrowed:</b>", body_text), Paragraph(f"{total_borrowed:,.2f} CRED", body_text)],
        [Paragraph("<b>Total Amount Repaid:</b>", body_text), Paragraph(f"{total_repaid:,.2f} CRED", body_text)],
    ]
    stats_table = Table(stats_data, colWidths=[175, 125])
    stats_table.setStyle(TableStyle([
        ("LINEBELOW", (0, 0), (-1, -1), 0.5, colors.HexColor("#F1F5F9")),
        ("PADDING", (0, 0), (-1, -1), 4),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))

    # Column Right: QR Code + Verification link
    qr_cell = [
        report_qr,
        Spacer(1, 4),
        Paragraph("<b>Scan to Independently Verify</b>", ParagraphStyle("QrText", parent=styles["Normal"], fontSize=7.5, alignment=1, textColor=colors.HexColor("#0F172A"))),
        Paragraph("No wallet required to verify", ParagraphStyle("QrSub", parent=styles["Normal"], fontSize=6.5, alignment=1, textColor=colors.HexColor("#64748B"))),
    ]

    metrics_container = [
        [stats_table, qr_cell]
    ]
    metrics_table = Table(metrics_container, colWidths=[315, 225])
    metrics_table.setStyle(TableStyle([
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#FFFFFF")),
        ("PADDING", (0, 0), (-1, -1), 8),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ALIGN", (1, 0), (1, 0), "CENTER"),
    ]))
    story.append(Paragraph("<b>1. On-Chain Borrower Reputation & Repayment History</b>", section_heading))
    story.append(Spacer(1, 4))
    story.append(metrics_table)
    story.append(Spacer(1, 12))

    # 4. Section 2: AI Credit Assessment
    risk_cat = passport_dict.get("risk_category", "LOW")
    confidence = passport_dict.get("confidence", 0.0)
    risk_color = "#059669" if risk_cat == "LOW" else ("#D97706" if risk_cat == "MEDIUM" else "#DC2626")

    ai_data = [
        [
            Paragraph("<b>Predicted Risk Band:</b>", body_text),
            Paragraph(f"<b><font color='{risk_color}'>{risk_cat} RISK</font></b>", body_text),
            Paragraph("<b>Model Confidence:</b>", body_text),
            Paragraph(f"{confidence * 100:.1f}%", body_text),
        ],
        [
            Paragraph("<b>Assessment Type:</b>", body_text),
            Paragraph("Off-chain Gradient Boosting & Consented Financial Data", body_text),
            Paragraph("<b>Feature Status:</b>", body_text),
            Paragraph("Consented Borrower Features", body_text),
        ]
    ]
    ai_table = Table(ai_data, colWidths=[110, 160, 110, 160])
    ai_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
        ("PADDING", (0, 0), (-1, -1), 5),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story.append(Paragraph("<b>2. AI Credit Risk Analysis (Off-Chain Machine Learning)</b>", section_heading))
    story.append(Spacer(1, 4))
    story.append(ai_table)
    story.append(Spacer(1, 12))

    # 5. Section 3: Financial Verification Reliability Layer
    fin_status = passport_dict.get("financial_verification_status", "UNVERIFIED")
    if fin_status == "SOURCE_VERIFIED":
        fin_color = "#059669"
        fin_desc = "Confirmed by authorized institutional attestation."
    elif fin_status == "EVIDENCE_CHECKED":
        fin_color = "#0284C7"
        fin_desc = "Reconciled within 5% tolerance. Issuer not authenticated."
    elif fin_status == "MANUAL_REVIEW":
        fin_color = "#DC2626"
        fin_desc = "Discrepancy detected; pending specialist evaluation."
    else:
        fin_color = "#D97706"
        fin_desc = "Self-declared borrower figures without supporting evidence."

    ver_data = [
        [
            Paragraph("<b>Verification Standing:</b>", body_text),
            Paragraph(f"<b><font color='{fin_color}'>{fin_status}</font></b>", body_text),
            Paragraph("<b>Reliability Assessment:</b>", body_text),
            Paragraph(fin_desc, body_text),
        ],
        [
            Paragraph("<b>Integrity Notice:</b>", body_text),
            Paragraph(
                "EVIDENCE_CHECKED confirms mathematical reconciliation within 5% tolerance but does NOT prove document authenticity. Only SOURCE_VERIFIED indicates third-party confirmation.",
                ParagraphStyle("NoticeStyle", parent=body_text, fontSize=7.5, leading=10, textColor=colors.HexColor("#64748B")),
            ),
            Paragraph("<b>Registry Contract:</b>", body_text),
            Paragraph("VerificationRegistry.sol", mono_style),
        ]
    ]
    ver_table = Table(ver_data, colWidths=[110, 160, 110, 160])
    ver_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
        ("PADDING", (0, 0), (-1, -1), 5),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story.append(Paragraph("<b>3. Financial Verification & Reliability Layer</b>", section_heading))
    story.append(Spacer(1, 4))
    story.append(ver_table)
    story.append(Spacer(1, 12))

    # 6. Section 4: On-Chain Cryptographic Proof
    data_hash = passport_dict.get("data_hash", "")
    tx_hash = passport_dict.get("tx_hash", "Registered via Anvil testnet")
    registry_addr = passport_dict.get("registry_address", REGISTRY_ADDRESS)

    proof_data = [
        [Paragraph("<b>Canonical Data SHA-256:</b>", body_text), Paragraph(data_hash, mono_style)],
        [Paragraph("<b>Registry Smart Contract:</b>", body_text), Paragraph(registry_addr, mono_style)],
        [Paragraph("<b>Transaction Reference:</b>", body_text), Paragraph(str(tx_hash), mono_style)],
        [Paragraph("<b>Blockchain Network:</b>", body_text), Paragraph("Ethereum Sepolia / Anvil Local (Chain ID: 31337)", body_text)],
        [Paragraph("<b>Public Verification URL:</b>", body_text), Paragraph(f"<a href='{verify_url}'>{verify_url}</a>", mono_style)],
    ]
    proof_table = Table(proof_data, colWidths=[140, 400])
    proof_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
        ("PADDING", (0, 0), (-1, -1), 5),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story.append(Paragraph("<b>4. Blockchain Cryptographic Anchoring & Independent Audit</b>", section_heading))
    story.append(Spacer(1, 4))
    story.append(proof_table)
    story.append(Spacer(1, 14))

    # 6. Legal & Academic Disclaimer
    disclaimer_text = (
        "<b>LEGAL & TECHNICAL NOTICE:</b> CredChain is an academic FinTech prototype combining off-chain machine "
        "learning risk assessment with Ethereum smart contracts. This credit passport reflects historical on-chain loan "
        "repayment behavior and consented credit application features. It is cryptographically anchored to prevent tampering, "
        "but does NOT constitute an official credit bureau score (e.g., FICO or Equifax) or financial investment advice. "
        "All third-party lenders may independently verify the authenticity of this document by querying the smart contract "
        "using the SHA-256 data hash or scanning the embedded QR code."
    )
    story.append(Paragraph(disclaimer_text, disclaimer_style))

    doc.build(story)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes
