"""Live E-Way Bill client — GSP REST proxy."""
from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone

import requests

from .eway import EWBResult


class LiveEWBClient:
    def __init__(self) -> None:
        self.base = (os.environ.get("EWB_BASE_URL") or os.environ.get("NIC_IRP_BASE_URL") or "").rstrip("/")
        self.username = os.environ.get("EWB_USERNAME", "")
        self.password = os.environ.get("EWB_PASSWORD", "")
        if not self.base:
            raise RuntimeError("EWB_BASE_URL (or NIC_IRP_BASE_URL) is required when EWB_MODE=LIVE")

    def _token(self) -> str:
        resp = requests.post(
            f"{self.base}/ewb/auth",
            json={"username": self.username, "password": self.password},
            timeout=30,
        )
        resp.raise_for_status()
        data = resp.json()
        return data.get("access_token") or data.get("token") or ""

    def generate(self, *, distance_km: int, **kwargs) -> EWBResult:
        token = self._token()
        headers = {"Authorization": f"Bearer {token}"} if token else {}
        resp = requests.post(
            f"{self.base}/ewb/generate",
            headers=headers,
            json={"distance_km": distance_km, **kwargs},
            timeout=60,
        )
        resp.raise_for_status()
        data = resp.json()
        now = datetime.now(timezone.utc)
        valid_until = data.get("valid_until")
        if isinstance(valid_until, str):
            try:
                vu = datetime.fromisoformat(valid_until.replace("Z", "+00:00"))
            except ValueError:
                vu = now + timedelta(days=max(1, (distance_km // 200) + 1))
        else:
            vu = now + timedelta(days=max(1, (distance_km // 200) + 1))
        return EWBResult(
            eway_no=str(data.get("eway_no") or data.get("EwbNo") or ""),
            generated_on=now,
            valid_until=vu,
        )

    def cancel(self, eway_no: str, reason: str) -> bool:
        token = self._token()
        headers = {"Authorization": f"Bearer {token}"} if token else {}
        resp = requests.post(
            f"{self.base}/ewb/cancel",
            headers=headers,
            json={"eway_no": eway_no, "reason": reason},
            timeout=30,
        )
        resp.raise_for_status()
        return True
