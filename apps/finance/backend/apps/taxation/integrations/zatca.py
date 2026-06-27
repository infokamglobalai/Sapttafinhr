"""ZATCA Fatoora (KSA) e-invoicing adapter — Phase 2 clearance.

Live clearance requires an onboarded CSID certificate + Fatoora API credentials,
and the cleared invoice carries an ECDSA cryptographic stamp (QR tags 7-9).

Set ZATCA_MODE=STUB (default) for dev: returns a deterministic 'cleared' result
without contacting ZATCA. Wire a LiveZatcaClient when certificates are available.
"""
import os
from dataclasses import dataclass
from datetime import datetime, timezone


@dataclass(frozen=True)
class ClearanceResult:
    status: str            # CLEARED | REPORTED | FAILED
    cleared_at: datetime
    signed_xml: str = ""
    response: str = ""


class StubZatcaClient:
    """Deterministic stub — does NOT submit to ZATCA. No CSID required."""

    def clear(self, *, xml: str, invoice_hash: str) -> ClearanceResult:
        return ClearanceResult(
            status="CLEARED",
            cleared_at=datetime.now(timezone.utc),
            signed_xml="",
            response="STUB: not submitted to ZATCA (no CSID certificate configured).",
        )


def get_zatca_client():
    mode = os.environ.get("ZATCA_MODE", "STUB").upper()
    if mode == "STUB":
        return StubZatcaClient()
    if mode == "LIVE":
        from .zatca_live import LiveZatcaClient
        return LiveZatcaClient()
    raise NotImplementedError(f"ZATCA_MODE={mode} not supported (use STUB or LIVE)")
