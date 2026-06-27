"""Live NIC IRP client — calls a GSP REST proxy (ClearTax, Masters India, etc.).

Configure via env:
  NIC_IRP_BASE_URL       e.g. https://gsp.example.com/api/v1
  NIC_IRP_CLIENT_ID      GSP client id
  NIC_IRP_CLIENT_SECRET  GSP client secret
  NIC_IRP_GSTIN          Supplier GSTIN (optional; passed per call if omitted)

The GSP is expected to expose:
  POST {base}/auth/token          → { "access_token": "..." }
  POST {base}/einvoice/generate   → { "irn", "ack_no", "ack_date", "signed_qr", "signed_invoice"? }
"""
from __future__ import annotations

import logging
import os
from datetime import datetime, timezone

import requests

from .nic_irp import IRNResult

logger = logging.getLogger(__name__)


class LiveIRPClient:
    def __init__(self) -> None:
        self.base = (os.environ.get("NIC_IRP_BASE_URL") or "").rstrip("/")
        self.client_id = os.environ.get("NIC_IRP_CLIENT_ID", "")
        self.client_secret = os.environ.get("NIC_IRP_CLIENT_SECRET", "")
        if not self.base:
            raise RuntimeError("NIC_IRP_BASE_URL is required when EINVOICE_MODE=LIVE")

    def _token(self) -> str:
        resp = requests.post(
            f"{self.base}/auth/token",
            json={"client_id": self.client_id, "client_secret": self.client_secret},
            timeout=30,
        )
        resp.raise_for_status()
        data = resp.json()
        token = data.get("access_token") or data.get("token")
        if not token:
            raise RuntimeError(f"GSP auth response missing token: {data!r}")
        return token

    def generate_irn(self, *, supplier_gstin: str, invoice_no: str,
                     invoice_date: str, total: str, payload: dict | None = None) -> IRNResult:
        gstin = supplier_gstin or os.environ.get("NIC_IRP_GSTIN", "")
        token = self._token()
        body: dict = {
            "supplier_gstin": gstin,
            "invoice_no": invoice_no,
            "invoice_date": invoice_date,
            "total": str(total),
        }
        if payload:
            body["nic_payload"] = payload
        resp = requests.post(
            f"{self.base}/einvoice/generate",
            headers={"Authorization": f"Bearer {token}"},
            json=body,
            timeout=60,
        )
        resp.raise_for_status()
        data = resp.json()
        ack_raw = data.get("ack_date") or data.get("AckDt")
        if isinstance(ack_raw, str):
            try:
                ack_date = datetime.fromisoformat(ack_raw.replace("Z", "+00:00"))
            except ValueError:
                ack_date = datetime.now(timezone.utc)
        else:
            ack_date = datetime.now(timezone.utc)
        return IRNResult(
            irn=data.get("irn") or data.get("Irn") or "",
            ack_no=str(data.get("ack_no") or data.get("AckNo") or ""),
            ack_date=ack_date,
            signed_qr=data.get("signed_qr") or data.get("SignedQRCode") or "",
            signed_invoice=data.get("signed_invoice") or data.get("SignedInvoice") or "",
        )

    def cancel_irn(self, irn: str, reason: str) -> bool:
        token = self._token()
        resp = requests.post(
            f"{self.base}/einvoice/cancel",
            headers={"Authorization": f"Bearer {token}"},
            json={"irn": irn, "reason": reason},
            timeout=30,
        )
        resp.raise_for_status()
        return True
