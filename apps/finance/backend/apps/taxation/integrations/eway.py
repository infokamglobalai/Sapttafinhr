"""E-Way Bill adapter (NIC EWB) using live APIs."""
import os
import requests
from dataclasses import dataclass
from datetime import datetime, timezone, timedelta
from rest_framework.exceptions import ValidationError
from django.conf import settings

@dataclass(frozen=True)
class EWBResult:
    eway_no: str
    generated_on: datetime
    valid_until: datetime


class RealEWBClient:
    def __init__(self, base_url, client_id, client_secret, username, password):
        self.base_url = base_url.rstrip("/")
        self.client_id = client_id
        self.client_secret = client_secret
        self.username = username
        self.password = password

    def authenticate(self) -> str:
        url = f"{self.base_url}/api/v1/authenticate"
        headers = {
            "client-id": self.client_id,
            "client-secret": self.client_secret,
            "Content-Type": "application/json"
        }
        payload = {
            "UserName": self.username,
            "Password": self.password
        }
        try:
            resp = requests.post(url, headers=headers, json=payload, timeout=10)
            resp.raise_for_status()
            data = resp.json()
            if data.get("Status") == 1:
                return data["Data"]["AuthToken"]
            else:
                errors = data.get("ErrorDetails", [])
                err_msg = ", ".join([f"{e.get('ErrorCode')}: {e.get('ErrorMessage')}" for e in errors])
                raise ValidationError(f"NIC EWB Auth Failed: {err_msg}")
        except Exception as e:
            if isinstance(e, ValidationError):
                raise
            raise ValidationError(f"NIC EWB Auth Connection Error: {str(e)}")

    def generate(self, *, distance_km: int, invoice_no: str, total: str, vehicle_no: str = "", **kwargs) -> EWBResult:
        token = self.authenticate()
        url = f"{self.base_url}/api/v1/ewaybill"
        headers = {
            "client-id": self.client_id,
            "client-secret": self.client_secret,
            "auth-token": token,
            "Content-Type": "application/json"
        }
        payload = {
            "supplyType": "O",
            "subSupplyType": "1",
            "docType": "INV",
            "docNo": invoice_no,
            "docDate": datetime.now(timezone.utc).strftime("%d/%m/%Y"),
            "fromGstin": "27ACMEX0000X1Z0",  # Placeholder
            "fromTrdName": "Saptta Client",
            "fromAddr1": "Office Suite",
            "fromAddr2": "",
            "fromPlace": "Mumbai",
            "fromPincode": 400001,
            "fromStateCode": 27,
            "toGstin": "27ACMEX0000X1Z0",  # Placeholder
            "toTrdName": "Acme Corp",
            "toAddr1": "Acme Building",
            "toAddr2": "",
            "toPlace": "Mumbai",
            "toPincode": 400001,
            "toStateCode": 27,
            "transDistance": distance_km,
            "transporterId": "",
            "transporterName": "",
            "transDocNo": "",
            "transDocDate": "",
            "vehicleNo": vehicle_no or "MH12AB1234",
            "vehicleType": "R",
            "transMode": "1",
            "totalValue": float(total),
            "cgstValue": 0,
            "sgstValue": 0,
            "igstValue": float(total) * 0.18,
            "cessValue": 0,
            "totInvValue": float(total) * 1.18,
            "itemList": [
                {
                    "productName": "Standard Service",
                    "productDesc": "Standard Service",
                    "hsnCode": 998311,
                    "quantity": 1,
                    "qtyUnit": "OTH",
                    "taxableAmount": float(total),
                    "cgstRate": 0,
                    "sgstRate": 0,
                    "igstRate": 18,
                    "cessRate": 0
                }
            ]
        }
        try:
            resp = requests.post(url, headers=headers, json=payload, timeout=10)
            resp.raise_for_status()
            data = resp.json()
            if data.get("Status") == 1:
                res_data = data["Data"]
                eway_no = str(res_data["ewayBillNo"])
                gen_date_str = res_data.get("ewayBillDate")
                try:
                    gen_date = datetime.strptime(gen_date_str, "%d/%m/%Y %H:%M:%S")
                    gen_date = gen_date.replace(tzinfo=timezone.utc)
                except Exception:
                    gen_date = datetime.now(timezone.utc)
                valid_until_str = res_data.get("validUpto")
                try:
                    valid_until = datetime.strptime(valid_until_str, "%d/%m/%Y %H:%M:%S")
                    valid_until = valid_until.replace(tzinfo=timezone.utc)
                except Exception:
                    days = max(1, (distance_km // 200) + 1)
                    valid_until = gen_date + timedelta(days=days)
                return EWBResult(
                    eway_no=eway_no,
                    generated_on=gen_date,
                    valid_until=valid_until
                )
            else:
                errors = data.get("ErrorDetails", [])
                err_msg = ", ".join([f"{e.get('ErrorCode')}: {e.get('ErrorMessage')}" for e in errors])
                raise ValidationError(f"NIC EWB Generate Failed: {err_msg}")
        except Exception as e:
            if isinstance(e, ValidationError):
                raise
            raise ValidationError(f"NIC EWB Generate Connection Error: {str(e)}")

    def cancel(self, eway_no: str, reason: str) -> bool:
        token = self.authenticate()
        url = f"{self.base_url}/api/v1/ewaybill/cancel"
        headers = {
            "client-id": self.client_id,
            "client-secret": self.client_secret,
            "auth-token": token,
            "Content-Type": "application/json"
        }
        payload = {
            "ewbNo": int(eway_no),
            "cancelRsnCode": 2,  # 2 = Data Entry Mistake
            "cancelRsnRem": reason[:100]
        }
        try:
            resp = requests.post(url, headers=headers, json=payload, timeout=10)
            resp.raise_for_status()
            data = resp.json()
            if data.get("Status") == 1:
                return True
            else:
                errors = data.get("ErrorDetails", [])
                err_msg = ", ".join([f"{e.get('ErrorCode')}: {e.get('ErrorMessage')}" for e in errors])
                raise ValidationError(f"NIC EWB Cancel Failed: {err_msg}")
        except Exception as e:
            if isinstance(e, ValidationError):
                raise
            raise ValidationError(f"NIC EWB Cancel Connection Error: {str(e)}")


def get_ewb_client():
    client_id = getattr(settings, "EWB_CLIENT_ID", "")
    client_secret = getattr(settings, "EWB_CLIENT_SECRET", "")
    username = getattr(settings, "EWB_USERNAME", "")
    password = getattr(settings, "EWB_PASSWORD", "")
    base_url = getattr(settings, "EWB_BASE_URL", "https://ewb-apisandbox.nic.in")

    if not all([client_id, client_secret, username, password]):
        raise ValueError("E-Way Bill (NIC EWB) credentials are not fully configured in settings.")
    return RealEWBClient(base_url, client_id, client_secret, username, password)
