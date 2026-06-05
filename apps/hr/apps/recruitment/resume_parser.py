"""AI-powered resume parser — extract candidate profile from PDF/DOCX."""
from __future__ import annotations

import json
import logging

logger = logging.getLogger(__name__)


def parse_resume(file_bytes: bytes, file_name: str = "") -> dict:
    """Extract structured candidate data from a resume file.

    Returns a dict with: name, email, phone, skills, experience, education, summary.
    Falls back to empty dict on failure.
    """
    from django.conf import settings
    api_key = getattr(settings, "ANTHROPIC_API_KEY", "")
    if not api_key:
        return {"error": "ANTHROPIC_API_KEY not configured"}

    # Extract text from file
    text = _extract_text(file_bytes, file_name)
    if not text:
        return {"error": "Could not extract text from file"}

    try:
        import anthropic
        client = anthropic.Anthropic(api_key=api_key)
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=1024,
            system=(
                "You are a resume data-extraction assistant for an HR recruitment system. "
                "Your ONLY task is to extract structured candidate data from the resume text provided "
                "and return it as valid JSON. "
                "Do NOT provide any commentary, hiring recommendations, or content outside the JSON response. "
                "Do NOT invent data not present in the resume — use empty string or null for missing fields. "
                "Do NOT evaluate or score the candidate."
            ),
            messages=[{
                "role": "user",
                "content": f"""Parse this resume and return ONLY valid JSON with these fields:
{{
  "full_name": "",
  "email": "",
  "phone": "",
  "current_company": "",
  "current_role": "",
  "total_experience_years": 0,
  "skills": [],
  "education": [
    {{"degree": "", "institution": "", "year": ""}}
  ],
  "experience": [
    {{"company": "", "role": "", "from": "", "to": "", "description": ""}}
  ],
  "summary": ""
}}

Resume text:
{text[:4000]}"""
            }]
        )
        raw = response.content[0].text.strip()
        if "```" in raw:
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        return json.loads(raw)
    except Exception as e:
        logger.exception("Resume parsing failed")
        return {"error": str(e)}


def _extract_text(file_bytes: bytes, file_name: str) -> str:
    """Extract plain text from PDF or DOCX."""
    name_lower = file_name.lower()

    if name_lower.endswith(".pdf"):
        try:
            import pdfplumber
            import io
            with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
                return "\n".join(p.extract_text() or "" for p in pdf.pages)
        except ImportError:
            pass
        try:
            # Fallback: PyPDF2
            import PyPDF2
            import io
            reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
            return "\n".join(page.extract_text() or "" for page in reader.pages)
        except Exception:
            return ""

    if name_lower.endswith(".docx"):
        try:
            import docx
            import io
            doc = docx.Document(io.BytesIO(file_bytes))
            return "\n".join(p.text for p in doc.paragraphs)
        except Exception:
            return ""

    # Plain text fallback
    try:
        return file_bytes.decode("utf-8", errors="ignore")
    except Exception:
        return ""
