"""
PDF generation with two backends:

  - WeasyPrint (primary) - requires system GTK/Pango/Cairo libs; produces
    pixel-perfect output. Used in production (Linux container).
  - xhtml2pdf (fallback) - pure Python; used automatically when WeasyPrint
    cannot load its native dependencies (typical on Windows dev boxes).

Templates are rendered to HTML first, then converted to PDF bytes.
"""
import io
import logging
from django.template.loader import render_to_string
from django.conf import settings

logger = logging.getLogger(__name__)


def _render_with_weasyprint(html_string: str, base_url: str) -> bytes:
    from weasyprint import HTML
    return HTML(string=html_string, base_url=base_url).write_pdf()


def _render_with_xhtml2pdf(html_string: str) -> bytes:
    """Fallback renderer. Pure-Python; less CSS fidelity but no system deps."""
    from xhtml2pdf import pisa
    buf = io.BytesIO()
    pisa_status = pisa.CreatePDF(src=html_string, dest=buf, encoding="utf-8")
    if pisa_status.err:
        raise RuntimeError(f"xhtml2pdf failed to render: {pisa_status.err} error(s)")
    return buf.getvalue()


def render_pdf(template_name: str, context: dict, base_url: str = None) -> bytes:
    """
    Render a Django template to PDF bytes.

    Tries WeasyPrint first; falls back to xhtml2pdf if WeasyPrint's native
    libraries are unavailable (e.g., Windows dev box without GTK).
    """
    html_string = render_to_string(template_name, context)
    base = base_url or f"file://{settings.BASE_DIR}/static/"

    try:
        return _render_with_weasyprint(html_string, base)
    except (OSError, ImportError) as exc:
        # OSError is what WeasyPrint raises on Windows when GTK is missing
        # ("cannot load library 'gobject-2.0-0'", "pango-1.0-0", etc.)
        msg = str(exc).lower()
        if any(lib in msg for lib in ("gobject", "pango", "cairo", "harfbuzz",
                                       "fontconfig", "weasyprint")):
            logger.warning("WeasyPrint native libs unavailable; falling back to xhtml2pdf.")
            return _render_with_xhtml2pdf(html_string)
        raise


def render_pdf_response(template_name: str, context: dict, filename: str):
    """Return a Django HttpResponse with PDF content."""
    from django.http import HttpResponse

    pdf_bytes = render_pdf(template_name, context)
    response = HttpResponse(pdf_bytes, content_type="application/pdf")
    response["Content-Disposition"] = f'inline; filename="{filename}"'
    return response
