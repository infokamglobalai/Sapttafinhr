"""Live UAE Peppol PINT AE delivery via Access Point API."""
from __future__ import annotations

import os
from datetime import datetime, timezone

import requests

from .peppol import DeliveryResult


class LivePeppolClient:
    def __init__(self) -> None:
        self.base = (os.environ.get("PEPPOL_BASE_URL") or "").rstrip("/")
        self.api_key = os.environ.get("PEPPOL_API_KEY", "")
        if not self.base:
            raise RuntimeError("PEPPOL_BASE_URL is required when PEPPOL_MODE=LIVE")

    def send(self, *, xml: str) -> DeliveryResult:
        headers = {"Content-Type": "application/xml"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        resp = requests.post(
            f"{self.base}/peppol/submit",
            headers=headers,
            data=xml.encode("utf-8"),
            timeout=90,
        )
        resp.raise_for_status()
        data = {}
        try:
            data = resp.json()
        except Exception:  # noqa: BLE001
            data = {"status": "REPORTED", "response": resp.text[:500]}
        return DeliveryResult(
            status=data.get("status") or "REPORTED",
            delivered_at=datetime.now(timezone.utc),
            response=str(data.get("response") or data.get("message") or "OK"),
        )
