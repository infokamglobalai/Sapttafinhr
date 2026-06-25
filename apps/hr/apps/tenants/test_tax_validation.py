"""Tests for tax ID validation on HR setup."""
from django.test import SimpleTestCase

from apps.tenants.tax_validation import (
    gstin_pan_consistency,
    validate_gstin,
    validate_gcc_tax_id,
    validate_pan,
)


class GstinValidationTests(SimpleTestCase):
    def test_valid_gstin(self):
        self.assertIsNone(validate_gstin("22AAAAA0000A1Z5"))

    def test_empty_allowed(self):
        self.assertIsNone(validate_gstin(""))
        self.assertIsNone(validate_pan(""))

    def test_invalid_length(self):
        self.assertIn("15 characters", validate_gstin("22AAAAA0000A1Z") or "")

    def test_invalid_format(self):
        self.assertIn("Invalid GSTIN", validate_gstin("ZZAAAAA0000A1Z5") or "")

    def test_pan_format(self):
        self.assertIsNone(validate_pan("AAAAA0000A"))
        self.assertIsNotNone(validate_pan("AAAA0000A"))

    def test_gstin_pan_match(self):
        self.assertIsNone(gstin_pan_consistency("22AAAAA0000A1Z5", "AAAAA0000A"))
        self.assertIn("must match", gstin_pan_consistency("22BBBBB0000A1Z5", "AAAAA0000A") or "")


class GccTaxIdTests(SimpleTestCase):
    def test_uae_trn(self):
        self.assertIsNone(validate_gcc_tax_id("AE", "100123456700003"))
        self.assertIsNotNone(validate_gcc_tax_id("AE", "123"))

    def test_ksa_vat(self):
        self.assertIsNone(validate_gcc_tax_id("SA", "310123456700003"))
        self.assertIsNotNone(validate_gcc_tax_id("SA", "210123456700003"))
