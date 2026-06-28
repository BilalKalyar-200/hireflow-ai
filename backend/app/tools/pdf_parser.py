"""
HireFlow AI — PDF Parser Tool.

Extracts raw text from resume PDF files using PyMuPDF,
with pdfplumber as fallback if PyMuPDF fails.
"""

import logging
from io import BytesIO
from typing import Any, Dict

from app.utils.exceptions import ToolError, ValidationError

logger = logging.getLogger(__name__)


def extract_text_from_pdf(pdf_bytes: bytes) -> Dict[str, Any]:
    """
    Extract all text from a PDF file.

    Input:
        pdf_bytes: raw bytes of the PDF file
    Output:
        dict with keys: text (str), page_count (int), parser_used (str)
    """
    if not pdf_bytes or len(pdf_bytes) < 100:
        raise ValidationError("pdf_bytes", "PDF file is empty or too small")

    text, page_count, parser = _parse_with_pymupdf(pdf_bytes)
    if not text.strip():
        text, page_count, parser = _parse_with_pdfplumber(pdf_bytes)

    if not text.strip():
        raise ToolError("pdf_parser", "Could not extract any text from PDF")

    return {
        "text": text.strip(),
        "page_count": page_count,
        "parser_used": parser,
    }


def _parse_with_pymupdf(pdf_bytes: bytes) -> tuple[str, int, str]:
    """
    Try parsing PDF with PyMuPDF (fitz).

    Input: pdf_bytes
    Output: tuple of (text, page_count, parser_name)
    """
    try:
        import fitz

        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        pages = []
        for page in doc:
            pages.append(page.get_text())
        doc.close()
        return "\n".join(pages), len(pages), "pymupdf"
    except Exception as exc:
        logger.warning("PyMuPDF failed: %s", exc)
        return "", 0, "pymupdf_failed"


def _parse_with_pdfplumber(pdf_bytes: bytes) -> tuple[str, int, str]:
    """
    Fallback PDF parsing with pdfplumber.

    Input: pdf_bytes
    Output: tuple of (text, page_count, parser_name)
    """
    try:
        import pdfplumber

        with pdfplumber.open(BytesIO(pdf_bytes)) as pdf:
            pages = [page.extract_text() or "" for page in pdf.pages]
        return "\n".join(pages), len(pages), "pdfplumber"
    except Exception as exc:
        logger.warning("pdfplumber failed: %s", exc)
        return "", 0, "pdfplumber_failed"
