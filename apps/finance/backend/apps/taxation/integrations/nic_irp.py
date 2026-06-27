"""NIC IRP adapter for E-Invoicing (IRN + signed QR).

In production, replace this stub with the NIC sandbox / live REST client.
Live API needs: GSTN-issued client_id/secret, auth-token rotation, JSON schema v1.1.

Set EINVOICE_MODE=STUB (default) for dev. The stub returns a deterministic
fake IRN so end-to-end flows can be tested without GSTN credentials.
"""
import hashlib
import os
from dataclasses import dataclass
from datetime import datetime, timezone


@dataclass(frozen=True)
class IRNResult:
    irn: str
    ack_no: str
    ack_date: datetime
    signed_qr: str
    signed_invoice: str = ""


class StubIRPClient:
    """Deterministic stub — does NOT call NIC. Returns fake but well-formed data."""

    def generate_irn(self, *, supplier_gstin: str, invoice_no: str,
                     invoice_date: str, total: str, payload: dict | None = None) -> IRNResult:
        base = f"{supplier_gstin}|{invoice_no}|{invoice_date}|{total}"
        if payload:
            import json
            base += "|" + json.dumps(payload, sort_keys=True, default=str)
        irn = hashlib.sha256(base.encode()).hexdigest()
        ack_no = f"112{abs(hash(invoice_no)) % 10**13:013d}"
        return IRNResult(
            irn=irn,
            ack_no=ack_no,
            ack_date=datetime.now(timezone.utc),
            signed_qr=f"STUB_QR_{irn[:32]}",
            signed_invoice="",
        )

    def cancel_irn(self, irn: str, reason: str) -> bool:
        return True


def get_irp_client():
    mode = os.environ.get("EINVOICE_MODE", "STUB").upper()
    if mode == "STUB":
        return StubIRPClient()
    if mode == "LIVE":
        from .nic_irp_live import LiveIRPClient
        return LiveIRPClient()
    raise NotImplementedError(f"EINVOICE_MODE={mode} not supported (use STUB or LIVE)")
