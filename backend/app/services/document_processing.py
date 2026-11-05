"""
Document processing and financial value extraction service using PyMuPDF and Tesseract OCR.
"""

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


# Priority 1: Explicit Net Salary / Take-Home Pay
NET_PAY_PATTERNS = [
    r"(?:net\s*(?:pay|salary|amount)|take\s*home)\s*[:=-]?\s*[^0-9a-zA-Z\s]*\s*([\d,]+(?:\.\d{2})?)",
    r"(?:salary\s*credit(?:ed)?|net\s*credited)\s*[:=-]?\s*[^0-9a-zA-Z\s]*\s*([\d,]+(?:\.\d{2})?)",
]

# Priority 2: Multi-month credits (e.g. Month 1: 79000, Month 2: 80000, Month 3: 78500)
MULTI_MONTH_PATTERNS = [
    r"(?:month\s*[1-6]|january|february|march|april|may|june|july|august|september|october|november|december)\s*[:=-]?\s*[^0-9a-zA-Z\s]*\s*([\d,]+(?:\.\d{2})?)",
    r"(?:salary|payroll|direct\s*deposit|neft\s*cr|imps\s*cr)\s*[:=-]?\s*[^0-9a-zA-Z\s]*\s*([\d,]+(?:\.\d{2})?)",
]

# Priority 3: Gross Pay / Total Earnings
GROSS_PAY_PATTERNS = [
    r"(?:gross\s*(?:pay|salary|earnings)|total\s*(?:pay|salary|earnings))\s*[:=-]?\s*[^0-9a-zA-Z\s]*\s*([\d,]+(?:\.\d{2})?)",
]


def _clean_amount(raw_str: str, allow_year: bool = False) -> Optional[float]:
    """Clean raw regex string to float amount. Filters out calendar years (2020-2035)."""
    if not raw_str:
        return None
    try:
        clean = raw_str.replace(",", "").strip()
        val = float(clean)
        # Exclude years (2020-2035) unless explicitly allowed
        if not allow_year and 2020 <= val <= 2035 and "." not in raw_str:
            return None
        # Discard trivial amounts or unreasonable numbers
        if 500 <= val <= 10_000_000:
            return val
    except ValueError:
        pass
    return None


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
    def process_file(cls, file_path: str, file_type: str) -> Tuple[str, Optional[float], List[float], float]:
        """
        Process uploaded file and extract financial values.
        Returns:
            (extracted_text, average_monthly_income, detected_credits_list, confidence)
        """
        file_type = file_type.lower()
        if file_type == "pdf" or file_path.endswith(".pdf"):
            text = cls.extract_text_from_pdf(file_path)
        elif file_type in ["png", "jpg", "jpeg"] or any(file_path.endswith(ext) for ext in [".png", ".jpg", ".jpeg"]):
            text = cls.extract_text_from_image(file_path)
        else:
            raise ValueError(f"Unsupported file type: {file_type}")

        if not text:
            return "", None, [], 0.0

        lower_text = text.lower()

        # 1. Check for explicit Net Pay / Take-home pay / Salary credits
        net_credits = []
        for pattern in NET_PAY_PATTERNS:
            for m in re.finditer(pattern, lower_text, re.IGNORECASE):
                amt = _clean_amount(m.group(1))
                if amt and amt not in net_credits:
                    net_credits.append(amt)

        if net_credits:
            avg_credit = sum(net_credits) / len(net_credits)
            confidence = min(0.98, 0.85 + (len(net_credits) * 0.04))
            return text, round(avg_credit, 2), [round(c, 2) for c in net_credits], round(confidence, 2)

        # 2. Check for multi-month credit patterns
        multi_credits = []
        for pattern in MULTI_MONTH_PATTERNS:
            for m in re.finditer(pattern, lower_text, re.IGNORECASE):
                amt = _clean_amount(m.group(1))
                if amt and amt not in multi_credits:
                    multi_credits.append(amt)

        if multi_credits:
            avg_credit = sum(multi_credits) / len(multi_credits)
            confidence = min(0.92, 0.70 + (len(multi_credits) * 0.06))
            return text, round(avg_credit, 2), [round(c, 2) for c in multi_credits], round(confidence, 2)

        # 3. Check for Gross Pay
        for pattern in GROSS_PAY_PATTERNS:
            matches = list(re.finditer(pattern, lower_text, re.IGNORECASE))
            if matches:
                for m in reversed(matches):
                    amt = _clean_amount(m.group(1))
                    if amt:
                        return text, round(amt, 2), [round(amt, 2)], 0.80

        # 4. Fallback: Standalone currency symbols (₹, Rs, $, USD)
        generic_currency_match = re.findall(r"(?:₹|rs\.?|inr|\$)\s*([\d,]+(?:\.\d{2})?)", lower_text)
        candidates = []
        for raw in generic_currency_match:
            amt = _clean_amount(raw, allow_year=True)
            if amt and amt not in candidates:
                candidates.append(amt)

        if candidates:
            candidates.sort()
            # Pick highest reasonable monthly salary figure
            val = candidates[-1]
            return text, round(val, 2), [round(c, 2) for c in candidates], 0.60

        return text, None, [], 0.0
