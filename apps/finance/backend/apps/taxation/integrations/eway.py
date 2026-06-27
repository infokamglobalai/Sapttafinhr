"""E-Way Bill adapter (NIC EWB). Stub returns fake EWB number for dev."""
import os
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone


@dataclass(frozen=True)
class EWBResult:
    eway_no: str
    generated_on: datetime
    valid_until: datetime


class StubEWBClient:
    def generate(self, *, distance_km: int, **kwargs) -> EWBResult:
        now = datetime.now(timezone.utc)
        days = max(1, (distance_km // 200) + 1)  # NIC: 1 day per 200 km
        return EWBResult(
            eway_no=f"{abs(hash(str(kwargs))) % 10**12:012d}",
            generated_on=now,
            valid_until=now + timedelta(days=days),
        )

    def cancel(self, eway_no: str, reason: str) -> bool:
        return True


def get_ewb_client():
    mode = os.environ.get("EWB_MODE", "STUB").upper()
    if mode == "STUB":
        return StubEWBClient()
    if mode == "LIVE":
        from .eway_live import LiveEWBClient
        return LiveEWBClient()
    raise NotImplementedError(f"EWB_MODE={mode} not supported (use STUB or LIVE)")
