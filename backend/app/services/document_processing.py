"""
Document processing and financial value extraction service using PyMuPDF and Tesseract OCR.
Independently extracts Gross Salary, Net Salary, Basic Salary, Allowances, and Total Deductions.
Never substitutes Net Salary for Gross Salary.
"""

from dataclasses import dataclass, field
import logging
import os
import re
from typing import Dict, List, Optional, Tuple

import fitz  # PyMuPDF
from PIL import Image

try:
    import pytesseract
    HAS_PYTESSERACT = True
except ImportError:
    HAS_PYTESSERACT = False

logger = logging.getLogger(__name__)


# Supported currency prefix pattern (e.g. $, USD, Rs., INR, EUR, GBP, ·, ₹, etc.)
CURRENCY_PREFIX = r"(?:\$|usd|rs\.?|inr|eur|gbp|·|₹|[^0-9a-zA-Z\s])*"


# Priority 1: Gross Monthly Salary / Gross Pay / Total Earnings
GROSS_PAY_PATTERNS = [
    rf"(?:gross\s*(?:monthly\s*)?(?:pay|salary|earnings|amount|income)|total\s*earnings|total\s*gross\s*(?:pay|salary|earnings)?|gross\s*total)(?:\s*\([^)]*\))?\s*[:=-]?\s*{CURRENCY_PREFIX}\s*([\d,]+(?:\.\d{{2}})?)",
]

# Priority 2: Net Monthly Salary / Net Pay / Take-Home Pay
NET_PAY_PATTERNS = [
    rf"(?:net\s*(?:monthly\s*)?(?:pay|salary|amount|income)|take[-\s]*home(?:\s*(?:pay|salary))?|total\s*net\s*pay)(?:\s*\([^)]*\))?\s*[:=-]?\s*{CURRENCY_PREFIX}\s*([\d,]+(?:\.\d{{2}})?)",
    rf"(?:salary\s*credit(?:ed)?|net\s*credited)\s*[:=-]?\s*{CURRENCY_PREFIX}\s*([\d,]+(?:\.\d{{2}})?)",
]

# Basic / Base Salary
BASIC_PAY_PATTERNS = [
    rf"(?:basic\s*(?:monthly\s*)?(?:pay|salary)|base\s*(?:monthly\s*)?(?:pay|salary))(?:\s*\([^)]*\))?\s*[:=-]?\s*{CURRENCY_PREFIX}\s*([\d,]+(?:\.\d{{2}})?)",
]

# Total Deductions
DEDUCTION_PATTERNS = [
    rf"(?:total\s*deductions?|deductions?\s*total|total\s*statutory\s*deductions?)(?:\s*\([^)]*\))?\s*[:=-]?\s*{CURRENCY_PREFIX}\s*([\d,]+(?:\.\d{{2}})?)",
]

# Allowances (Total or individual lines)
TOTAL_ALLOWANCE_PATTERNS = [
    rf"(?:total\s*allowances?|allowances?\s*total)(?:\s*\([^)]*\))?\s*[:=-]?\s*{CURRENCY_PREFIX}\s*([\d,]+(?:\.\d{{2}})?)",
]

INDIVIDUAL_ALLOWANCE_PATTERN = (
    rf"(?:[^\n\r]*?allowance)\s*[:=-]?\s*{CURRENCY_PREFIX}\s*([\d,]+(?:\.\d{{2}})?)"
)

# Multi-month statement credits (e.g. Month 1: 79000, Month 2: 80000, Month 3: 78500)
MULTI_MONTH_PATTERNS = [
    rf"(?:month\s*[1-6]|january|february|march|april|may|june|july|august|september|october|november|december)\s*[:=-]?\s*{CURRENCY_PREFIX}\s*([\d,]+(?:\.\d{{2}})?)",
    rf"(?:salary|payroll|direct\s*deposit|neft\s*cr|imps\s*cr)\s*[:=-]?\s*{CURRENCY_PREFIX}\s*([\d,]+(?:\.\d{{2}})?)",
]


def _clean_amount(raw_str: str, min_val: float = 500.0, allow_year: bool = False) -> Optional[float]:
    """Clean raw regex string to float amount. Excludes calendar years (2020-2035)."""
    if not raw_str:
        return None
    try:
        clean = raw_str.replace(",", "").strip()
        val = float(clean)
        if not allow_year and 2020 <= val <= 2035 and "." not in raw_str:
            return None
        if min_val <= val <= 10_000_000:
            return round(val, 2)
    except ValueError:
        pass
    return None


@dataclass
class PayrollExtractionResult:
    """Structured extraction result identifying independent salary components."""
    text: str
    gross_monthly_salary: Optional[float] = None
    net_monthly_salary: Optional[float] = None
    basic_salary: Optional[float] = None
    allowances: Optional[float] = None
    total_deductions: Optional[float] = None
    detected_credits: List[float] = field(default_factory=list)
    confidence: float = 0.0
    is_gross_identified: bool = False
    status_flag: str = "MANUAL_REVIEW"  # EVIDENCE_CHECKED, MANUAL_REVIEW, EXTRACTION_INCOMPLETE
    notes: str = ""

    # Enable tuple-style unpacking for backward compatibility:
    # (extracted_text, gross_salary, detected_credits, confidence)
    def __iter__(self):
        yield self.text
        yield self.gross_monthly_salary
        yield self.detected_credits
        yield self.confidence

    def __getitem__(self, index):
        items = (self.text, self.gross_monthly_salary, self.detected_credits, self.confidence)
        return items[index]


class DocumentProcessor:
    """Extracts text and financial figures from uploaded salary slips and bank statements."""

    @staticmethod
    def extract_text_from_pdf(file_path: str) -> str:
        """Extract text from PDF using PyMuPDF, with OCR fallback for scanned pages."""
        text = ""
        try:
            doc = fitz.open(file_path)
            for page in doc:
                page_text = page.get_text()
                text += page_text + "\n"

            # If extracted text is minimal (scanned PDF), use OCR
            if len(text.strip()) < 50 and HAS_PYTESSERACT:
                logger.info("PDF has minimal native text; triggering Tesseract OCR for %s", file_path)
                ocr_text = ""
                for page in doc:
                    pix = page.get_pixmap(dpi=200)
                    img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                    ocr_text += pytesseract.image_to_string(img) + "\n"
                if ocr_text.strip():
                    text = ocr_text
            doc.close()
        except Exception as exc:
            logger.error("Error reading PDF %s: %s", file_path, exc)
            raise RuntimeError(f"PDF processing failed: {str(exc)}")

        return text.strip()

    @staticmethod
    def extract_text_from_image(file_path: str) -> str:
        """Extract text from JPG/PNG using Tesseract OCR."""
        if not HAS_PYTESSERACT:
            raise RuntimeError("pytesseract is required for image extraction.")

        try:
            img = Image.open(file_path)
            gray_img = img.convert("L")
            text = pytesseract.image_to_string(gray_img)
            return text.strip()
        except Exception as exc:
            logger.error("Error running OCR on %s: %s", file_path, exc)
            raise RuntimeError(f"OCR processing failed: {str(exc)}")

    @classmethod
    def process_file(cls, file_path: str, file_type: str) -> PayrollExtractionResult:
        """
        Process uploaded file and extract independent financial values.
        Returns a PayrollExtractionResult dataclass (which also unpacks as a 4-tuple for compatibility).
        """
        file_type = file_type.lower()
        if file_type == "pdf" or file_path.endswith(".pdf"):
            text = cls.extract_text_from_pdf(file_path)
        elif file_type in ["png", "jpg", "jpeg"] or any(file_path.endswith(ext) for ext in [".png", ".jpg", ".jpeg"]):
            text = cls.extract_text_from_image(file_path)
        else:
            raise ValueError(f"Unsupported file type: {file_type}")

        if not text or not text.strip():
            return PayrollExtractionResult(text="", notes="No readable text detected.")

        res = PayrollExtractionResult(text=text)

        # 1. Independently identify Gross Monthly Salary / Gross Pay / Total Earnings
        for pattern in GROSS_PAY_PATTERNS:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                val = _clean_amount(match.group(1))
                if val:
                    res.gross_monthly_salary = val
                    res.is_gross_identified = True
                    break

        # 2. Independently identify Net Monthly Salary / Net Pay / Take-Home Pay
        for pattern in NET_PAY_PATTERNS:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                val = _clean_amount(match.group(1))
                if val:
                    res.net_monthly_salary = val
                    break

        # 3. Independently identify Basic Salary / Base Salary
        for pattern in BASIC_PAY_PATTERNS:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                val = _clean_amount(match.group(1))
                if val:
                    res.basic_salary = val
                    break

        # 4. Independently identify Total Deductions
        for pattern in DEDUCTION_PATTERNS:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                val = _clean_amount(match.group(1), min_val=10.0)
                if val:
                    res.total_deductions = val
                    break

        # 5. Independently identify Allowances
        for pattern in TOTAL_ALLOWANCE_PATTERNS:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                val = _clean_amount(match.group(1), min_val=10.0)
                if val:
                    res.allowances = val
                    break

        # If total allowances not stated as a single line, check individual allowance lines
        if res.allowances is None:
            indiv_matches = re.findall(INDIVIDUAL_ALLOWANCE_PATTERN, text, re.IGNORECASE)
            if indiv_matches:
                total_indiv = sum(_clean_amount(m, min_val=10.0) or 0.0 for m in indiv_matches)
                if total_indiv > 0:
                    res.allowances = round(total_indiv, 2)
            elif (
                res.gross_monthly_salary is not None
                and res.basic_salary is not None
                and res.gross_monthly_salary >= res.basic_salary
            ):
                res.allowances = round(res.gross_monthly_salary - res.basic_salary, 2)

        # If deductions not explicitly parsed but gross and net are known
        if (
            res.total_deductions is None
            and res.gross_monthly_salary is not None
            and res.net_monthly_salary is not None
            and res.gross_monthly_salary >= res.net_monthly_salary
        ):
            res.total_deductions = round(res.gross_monthly_salary - res.net_monthly_salary, 2)

        # Build detected credits list
        credits: List[float] = []
        if res.gross_monthly_salary:
            credits.append(res.gross_monthly_salary)
        if res.net_monthly_salary and res.net_monthly_salary not in credits:
            credits.append(res.net_monthly_salary)

        # If neither gross nor net detected via payslip headers, check multi-month bank statements
        if not credits:
            multi_credits = []
            for pattern in MULTI_MONTH_PATTERNS:
                for m in re.finditer(pattern, text, re.IGNORECASE):
                    val = _clean_amount(m.group(1))
                    if val and val not in multi_credits:
                        multi_credits.append(val)

            if multi_credits:
                avg_credit = round(sum(multi_credits) / len(multi_credits), 2)
                res.gross_monthly_salary = avg_credit
                res.is_gross_identified = True
                res.detected_credits = [round(c, 2) for c in multi_credits]
                res.confidence = min(0.92, 0.70 + (len(multi_credits) * 0.05))
                res.status_flag = "EVIDENCE_CHECKED"
                res.notes = f"Multi-month statement credits detected. Average: ${avg_credit:,.2f} across {len(multi_credits)} entries."
                return res

            # Fallback: standalone currency symbols
            generic_currency = re.findall(rf"{CURRENCY_PREFIX}\s*([\d,]+(?:\.\d{{2}})?)" , text)
            candidates = []
            for raw in generic_currency:
                amt = _clean_amount(raw, allow_year=True)
                if amt and amt not in candidates:
                    candidates.append(amt)

            if candidates:
                candidates.sort()
                highest = candidates[-1]
                # Flag as MANUAL_REVIEW / EXTRACTION_INCOMPLETE because header is ambiguous
                res.gross_monthly_salary = round(highest, 2)
                res.is_gross_identified = False  # Ambiguous
                res.confidence = 0.50
                res.status_flag = "MANUAL_REVIEW"
                res.detected_credits = [round(c, 2) for c in candidates]
                res.notes = "Ambiguous figures detected without verified gross salary headers. Requires manual review."
                return res

        res.detected_credits = credits

        # Determine evidence status and confidence
        if res.is_gross_identified and res.gross_monthly_salary is not None:
            res.status_flag = "EVIDENCE_CHECKED"
            if res.net_monthly_salary is not None:
                res.confidence = 0.95
                res.notes = (
                    f"Gross salary (${res.gross_monthly_salary:,.2f}) and net salary "
                    f"(${res.net_monthly_salary:,.2f}) independently identified."
                )
            else:
                res.confidence = 0.85
                res.notes = f"Gross salary (${res.gross_monthly_salary:,.2f}) identified."
        elif res.net_monthly_salary is not None and not res.is_gross_identified:
            # Net salary found but Gross salary missing:
            # Rule: NEVER silently substitute net salary for gross salary!
            res.status_flag = "MANUAL_REVIEW"
            res.confidence = 0.65
            res.notes = (
                f"Net salary (${res.net_monthly_salary:,.2f}) was detected, but Gross Monthly Salary "
                f"could not be identified with confidence. Gross salary is required for reconciliation."
            )
        else:
            res.status_flag = "MANUAL_REVIEW"
            res.confidence = 0.0
            res.notes = "No confident gross or net payroll values identified."

        return res
