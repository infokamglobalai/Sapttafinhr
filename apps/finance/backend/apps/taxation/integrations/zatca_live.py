"""Live ZATCA Fatoora clearance via configured API gateway."""
from __future__ import annotations

import os
from datetime import datetime, timezone

import requests

from .zatca import ClearanceResult


class LiveZatcaClient:
    def __init__(self) -> None:
        self.base = (os.environ.get("ZATCA_BASE_URL") or os.environ.get("NIC_IRP_BASE_URL") or "").rstrip("/")
        self.client_id = os.environ.get("ZATCA_CLIENT_ID", os.environ.get("NIC_IRP_CLIENT_ID", ""))
        self.client_secret = os.environ.get("ZATCA_CLIENT_SECRET", os.environ.get("NIC_IRP_CLIENT_SECRET", ""))
        if not self.base:
            raise RuntimeError("ZATCA_BASE_URL is required when ZATCA_MODE=LIVE")

    def _token(self) -> str:
        resp = requests.post(
            f"{self.base}/auth/token",
            json={"client_id": self.client_id, "client_secret": self.client_secret},
            timeout=30,
        )
        resp.raise_for_status()
        data = resp.json()
        return data.get("access_token") or data.get("token") or ""

    def clear(self, *, xml: str, invoice_hash: str) -> ClearanceResult:
        token = self._token()
        resp = requests.post(
            f"{self.base}/zatca/clear",
            headers={"Authorization": f"Bearer {token}"},
            json={"xml": xml, "invoice_hash": invoice_hash},
            timeout=90,
        )
        resp.raise_for_status()
        data = resp.json()
        status = data.get("status") or data.get("clearanceStatus") or "CLEARED"
        cleared_raw = data.get("cleared_at") or data.get("clearanceDateTime")
        if isinstance(cleared_raw, str):
            try:
                cleared_at = datetime.fromisoformat(cleared_raw.replace("Z", "+00:00"))
            except ValueError:
                cleared_at = datetime.now(timezone.utc)
        else:
            cleared_at = datetime.now(timezone.utc)
        return ClearanceResult(
            status=status,
            cleared_at=cleared_at,
            signed_xml=data.get("signed_xml") or data.get("clearedInvoice") or "",
            response=str(data.get("message") or data.get("response") or "OK"),
        )
