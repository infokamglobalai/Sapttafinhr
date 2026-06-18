"""Upload validation — extension allowlist, size cap, and a content sniff.

Vibe-coded uploads typically trust the client: no size limit, no extension check,
and they store request.FILES[...].content_type (which the client controls) as
truth. That lets a user upload an .svg/.html disguised as a doc (stored XSS when
served inline) or a multi-GB file (DoS).

This module is dependency-free (no libmagic): it checks the real file size, an
extension allowlist, and sniffs the leading bytes to (a) reject markup polyglots
and (b) confirm the magic number for the binary types we can cheaply verify.
"""
from __future__ import annotations

import os

from django.core.exceptions import ValidationError

DEFAULT_MAX_MB = 10

DOCUMENT_EXTS = {".pdf", ".jpg", ".jpeg", ".png", ".webp", ".doc", ".docx", ".xls", ".xlsx"}
RESUME_EXTS = {".pdf", ".doc", ".docx", ".txt"}
IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp"}
STATEMENT_EXTS = {".csv", ".xls", ".xlsx", ".pdf", ".ofx", ".txt"}

# Magic numbers for formats we can verify cheaply. Office files (docx/xlsx) are
# ZIP containers (PK..) and legacy doc/xls are OLE (\xD0\xCF..); both are covered.
_SIGNATURES: dict[str, tuple[bytes, ...]] = {
    ".pdf": (b"%PDF",),
    ".png": (b"\x89PNG\r\n\x1a\n",),
    ".jpg": (b"\xff\xd8\xff",),
    ".jpeg": (b"\xff\xd8\xff",),
    ".docx": (b"PK\x03\x04",),
    ".xlsx": (b"PK\x03\x04",),
    ".doc": (b"\xd0\xcf\x11\xe0",),
    ".xls": (b"\xd0\xcf\x11\xe0",),
}


def validate_upload(f, *, allowed_exts: set[str], max_mb: int = DEFAULT_MAX_MB):
    """Validate an UploadedFile. Returns the file, or raises ValidationError.

    Pass-through for None so callers can use it on optional fields.
    """
    if not f:
        return f

    size = getattr(f, "size", 0) or 0
    if size == 0:
        raise ValidationError("The uploaded file is empty.")
    if size > max_mb * 1024 * 1024:
        raise ValidationError(f"File too large — maximum size is {max_mb} MB.")

    ext = os.path.splitext(f.name or "")[1].lower()
    if ext not in allowed_exts:
        allowed = ", ".join(sorted(e.lstrip(".") for e in allowed_exts))
        raise ValidationError(f"Unsupported file type. Allowed: {allowed}.")

    head = f.read(8)
    f.seek(0)

    # Reject markup polyglots (HTML/SVG/XML) — none of the allowed binary types
    # begin with '<'. This is what blocks an .svg/.html stored-XSS payload.
    if head.lstrip()[:1] == b"<":
        raise ValidationError("File content does not match its type.")

    expected = _SIGNATURES.get(ext)
    if expected and not any(head.startswith(sig) for sig in expected):
        raise ValidationError("File content does not match its extension.")

    return f
