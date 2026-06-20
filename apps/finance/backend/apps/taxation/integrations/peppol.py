"""UAE Peppol PINT AE e-invoicing adapter — 5-corner model.

Live delivery routes the PINT-AE document through a contracted Accredited Service
Provider (Access Point). Set PEPPOL_MODE=STUB (default) for dev: returns a
deterministic 'reported' result without contacting an Access Point.
"""
import os
from dataclasses import dataclass
from datetime import datetime, timezone


@dataclass(frozen=True)
class DeliveryResult:
    status: str            # REPORTED | FAILED
    delivered_at: datetime
    response: str = ""


class StubPeppolClient:
    """Deterministic stub — does NOT deliver via Peppol. No Access Point required."""

    def send(self, *, xml: str) -> DeliveryResult:
        return DeliveryResult(
            status="REPORTED",
            delivered_at=datetime.now(timezone.utc),
            response="STUB: not delivered via Peppol (no Access Provider configured).",
        )


def get_peppol_client():
    mode = os.environ.get("PEPPOL_MODE", "STUB").upper()
    if mode == "STUB":
        return StubPeppolClient()
    # from .peppol_live import LivePeppolClient; return LivePeppolClient(...)
    raise NotImplementedError(f"PEPPOL_MODE={mode} not implemented yet")
