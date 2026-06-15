"""Tests for apps.core.net — the SSRF outbound-URL guard."""
from django.test import SimpleTestCase, override_settings

from apps.core.net import UnsafeURLError, validate_outbound_url


@override_settings(ALLOW_PRIVATE_OUTBOUND_URLS=False)
class OutboundURLGuardTest(SimpleTestCase):
    """IP literals are used so the guard never depends on live DNS."""

    def test_blocks_cloud_metadata_endpoint(self):
        with self.assertRaises(UnsafeURLError):
            validate_outbound_url("http://169.254.169.254/latest/meta-data/")

    def test_blocks_loopback(self):
        for url in ("http://127.0.0.1/hook", "http://[::1]/hook"):
            with self.assertRaises(UnsafeURLError):
                validate_outbound_url(url)

    def test_blocks_private_ranges(self):
        for url in ("http://10.0.0.5/", "http://192.168.1.1/", "http://172.16.0.1/"):
            with self.assertRaises(UnsafeURLError):
                validate_outbound_url(url)

    def test_blocks_non_http_schemes(self):
        for url in ("ftp://8.8.8.8/", "file:///etc/passwd", "gopher://8.8.8.8/"):
            with self.assertRaises(UnsafeURLError):
                validate_outbound_url(url)

    def test_allows_public_address(self):
        # Public IP literal — resolves locally, no network call.
        self.assertEqual(validate_outbound_url("https://8.8.8.8/hook"), "https://8.8.8.8/hook")

    @override_settings(ALLOW_PRIVATE_OUTBOUND_URLS=True)
    def test_guard_disabled_passes_everything(self):
        # When private hosts are allowed (e.g. local dev) the guard is a no-op.
        self.assertEqual(validate_outbound_url("http://localhost:9000/"), "http://localhost:9000/")
