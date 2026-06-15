"""Tests for the shared upload validator (utils.uploads)."""
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import SimpleTestCase

from utils.uploads import DOCUMENT_EXTS, RESUME_EXTS, validate_upload


class UploadValidatorTest(SimpleTestCase):
    def _file(self, name, content):
        return SimpleUploadedFile(name, content)

    def test_accepts_valid_pdf(self):
        f = self._file("offer.pdf", b"%PDF-1.5\n...binary...")
        self.assertIs(validate_upload(f, allowed_exts=DOCUMENT_EXTS), f)

    def test_rejects_html_disguised_as_pdf(self):
        # Stored-XSS payload with an allowed extension — content sniff must catch it.
        f = self._file("evil.pdf", b"<html><script>alert(1)</script></html>")
        with self.assertRaises(ValidationError):
            validate_upload(f, allowed_exts=DOCUMENT_EXTS)

    def test_rejects_svg(self):
        f = self._file("x.png", b"<svg xmlns='http://www.w3.org/2000/svg'><script>1</script></svg>")
        with self.assertRaises(ValidationError):
            validate_upload(f, allowed_exts=DOCUMENT_EXTS)

    def test_rejects_disallowed_extension(self):
        f = self._file("payload.exe", b"MZ\x90\x00")
        with self.assertRaises(ValidationError):
            validate_upload(f, allowed_exts=RESUME_EXTS)

    def test_rejects_oversized(self):
        f = self._file("big.pdf", b"%PDF" + b"0" * (2 * 1024 * 1024))
        with self.assertRaises(ValidationError):
            validate_upload(f, allowed_exts=DOCUMENT_EXTS, max_mb=1)

    def test_rejects_empty(self):
        f = self._file("empty.pdf", b"")
        with self.assertRaises(ValidationError):
            validate_upload(f, allowed_exts=DOCUMENT_EXTS)

    def test_rejects_signature_mismatch(self):
        # .png extension but bytes are not a PNG.
        f = self._file("fake.png", b"not-a-real-png-file")
        with self.assertRaises(ValidationError):
            validate_upload(f, allowed_exts=DOCUMENT_EXTS)

    def test_none_passes_through(self):
        self.assertIsNone(validate_upload(None, allowed_exts=DOCUMENT_EXTS))
