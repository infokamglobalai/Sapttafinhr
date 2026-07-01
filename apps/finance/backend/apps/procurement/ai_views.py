"""AI-powered procurement — vendor bill scanner (PDF → form data)."""
from __future__ import annotations

import base64
import logging

from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

logger = logging.getLogger(__name__)


class VendorBillScanView(APIView):
    """POST /api/v1/procurement/vendor-bills/scan/ — upload a vendor bill PDF/image.
    Returns extracted field values to pre-fill the vendor bill form.
    """
    parser_classes = [MultiPartParser]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        from django.conf import settings
        api_key = getattr(settings, "ANTHROPIC_API_KEY", "")
        if not api_key:
            return Response({"detail": "AI extraction not configured (ANTHROPIC_API_KEY not set)."}, status=503)

        file = request.FILES.get("file")
        if not file:
            return Response({"detail": "file is required"}, status=400)

        content_type = file.content_type or "application/octet-stream"
        raw = file.read()
        b64 = base64.standard_b64encode(raw).decode()

        try:
            import anthropic
            client = anthropic.Anthropic(api_key=api_key)

            # Build prompt — use vision for images, text extraction for PDFs
            if "pdf" in content_type:
                # For PDFs, try to extract text first
                try:
                    import pdfplumber
                    import io
                    with pdfplumber.open(io.BytesIO(raw)) as pdf:
                        text = "\n".join(p.extract_text() or "" for p in pdf.pages)
                except Exception:
                    text = "(PDF text extraction failed)"

                msg_content = [
                    {
                        "type": "text",
                        "text": f"""Extract structured data from this vendor invoice. Return ONLY valid JSON with these fields:
{{
  "vendor_name": "",
  "vendor_gstin": "",
  "invoice_number": "",
  "invoice_date": "YYYY-MM-DD",
  "due_date": "YYYY-MM-DD or null",
  "place_of_supply": "2-digit state code",
  "line_items": [
    {{"description": "", "hsn_code": "", "quantity": 0, "unit_price": 0, "tax_rate": 18, "amount": 0}}
  ],
  "subtotal": 0,
  "cgst": 0,
  "sgst": 0,
  "igst": 0,
  "total": 0,
  "notes": ""
}}

Invoice text:
{text}"""
                    }
                ]
            else:
                # Image — use vision
                msg_content = [
                    {
                        "type": "image",
                        "source": {"type": "base64", "media_type": content_type, "data": b64}
                    },
                    {
                        "type": "text",
                        "text": """Extract structured data from this vendor invoice. Return ONLY valid JSON with these fields:
{
  "vendor_name": "",
  "vendor_gstin": "",
  "invoice_number": "",
  "invoice_date": "YYYY-MM-DD",
  "due_date": "YYYY-MM-DD or null",
  "place_of_supply": "2-digit state code",
  "line_items": [
    {"description": "", "hsn_code": "", "quantity": 0, "unit_price": 0, "tax_rate": 18, "amount": 0}
  ],
  "subtotal": 0,
  "cgst": 0,
  "sgst": 0,
  "igst": 0,
  "total": 0,
  "notes": ""
}"""
                    }
                ]

            system = (
                "You are a data-extraction assistant for an Indian accounting system. "
                "Your ONLY task is to extract structured invoice data from the document provided "
                "and return it as valid JSON. "
                "Do NOT provide any commentary, advice, or content outside the JSON response. "
                "Do NOT invent data that is not present in the document — use null for missing fields."
            )
            response = client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=1024,
                system=system,
                messages=[{"role": "user", "content": msg_content}]
            )

            import json
            raw_text = response.content[0].text.strip()
            # Extract JSON if wrapped in markdown code block
            if "```" in raw_text:
                raw_text = raw_text.split("```")[1]
                if raw_text.startswith("json"):
                    raw_text = raw_text[4:]

            data = json.loads(raw_text)
            data["_source"] = "ai_extracted"
            data["_confidence"] = "medium"
            return Response(data)

        except Exception as e:
            logger.exception("Bill scan failed")
            return Response({"detail": f"Extraction failed: {e}"}, status=500)
