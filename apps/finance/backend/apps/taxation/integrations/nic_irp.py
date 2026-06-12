"""NIC IRP adapter for E-Invoicing (IRN + signed QR) using live APIs."""
import os
import requests
from dataclasses import dataclass
from datetime import datetime, timezone
from rest_framework.exceptions import ValidationError
from django.conf import settings

@dataclass(frozen=True)
class IRNResult:
    irn: str
    ack_no: str
    ack_date: datetime
    signed_qr: str
    signed_invoice: str = ""


class RealIRPClient:
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
                raise ValidationError(f"NIC IRP Auth Failed: {err_msg}")
        except Exception as e:
            if isinstance(e, ValidationError):
                raise
            raise ValidationError(f"NIC IRP Auth Connection Error: {str(e)}")

    def generate_irn(self, *, supplier_gstin: str, invoice_no: str,
                     invoice_date: str, total: str) -> IRNResult:
        token = self.authenticate()
        url = f"{self.base_url}/api/v1/einvoice/generate"
        headers = {
            "client-id": self.client_id,
            "client-secret": self.client_secret,
            "auth-token": token,
            "user-token": token,
            "Gstin": supplier_gstin,
            "Content-Type": "application/json"
        }
        # Standard NIC E-Invoice JSON payload schema mapping basic values
        payload = {
            "Version": "1.1",
            "TranDtls": {
                "TaxSch": "GST",
                "SupTyp": "B2B",
                "RegRev": "N",
                "EcmGstin": None,
                "IgstOnIntra": "N"
            },
            "DocDtls": {
                "Typ": "INV",
                "No": invoice_no,
                "Dt": invoice_date
            },
            "SellerDtls": {
                "Gstin": supplier_gstin,
                "LglNm": "Saptta Client",
                "Addr1": "Office Suite",
                "Loc": "Mumbai",
                "Pin": 400001,
                "Stcd": supplier_gstin[:2]
            },
            "BuyerDtls": {
                "Gstin": "27ACMEX0000X1Z0",  # Default buyer placeholder
                "LglNm": "Acme Corp",
                "Addr1": "Acme Building",
                "Loc": "Mumbai",
                "Pin": 400001,
                "Stcd": "27"
            },
            "ValDtls": {
                "AssVal": float(total),
                "TotInvVal": float(total)
            },
            "ItemList": [
                {
                    "SlNo": "1",
                    "PrdNm": "Standard Service",
                    "IsServc": "Y",
                    "HsnCd": "998311",
                    "Qty": 1,
                    "Unit": "OTH",
                    "UnitPrice": float(total),
                    "TotAmt": float(total),
                    "Discount": 0,
                    "PreTaxVal": float(total),
                    "AssAmt": float(total),
                    "GstRt": 18,
                    "CgstAmt": 0,
                    "SgstAmt": 0,
                    "IgstAmt": float(total) * 0.18,
                    "TotItemVal": float(total) * 1.18
                }
            ]
        }
        try:
            resp = requests.post(url, headers=headers, json=payload, timeout=10)
            resp.raise_for_status()
            data = resp.json()
            if data.get("Status") == 1:
                res_data = data["Data"]
                ack_date_str = res_data.get("AckDt")
                try:
                    ack_date = datetime.strptime(ack_date_str, "%Y-%m-%d %H:%M:%S")
                    ack_date = ack_date.replace(tzinfo=timezone.utc)
                except Exception:
                    ack_date = datetime.now(timezone.utc)
                return IRNResult(
                    irn=res_data["Irn"],
                    ack_no=str(res_data["AckNo"]),
                    ack_date=ack_date,
                    signed_qr=res_data["SignedQrCode"],
                    signed_invoice=res_data.get("SignedInvoice", "")
                )
            else:
                errors = data.get("ErrorDetails", [])
                err_msg = ", ".join([f"{e.get('ErrorCode')}: {e.get('ErrorMessage')}" for e in errors])
                raise ValidationError(f"NIC IRP Generate IRN Failed: {err_msg}")
        except Exception as e:
            if isinstance(e, ValidationError):
                raise
            raise ValidationError(f"NIC IRP Generate IRN Connection Error: {str(e)}")

    def cancel_irn(self, irn: str, reason: str) -> bool:
        token = self.authenticate()
        url = f"{self.base_url}/api/v1/einvoice/cancel"
        headers = {
            "client-id": self.client_id,
            "client-secret": self.client_secret,
            "auth-token": token,
            "user-token": token,
            "Content-Type": "application/json"
        }
        payload = {
            "Irn": irn,
            "CnlRsn": "2",  # 2 = Data Entry Mistake
            "CnlRem": reason[:100]
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
                raise ValidationError(f"NIC IRP Cancel IRN Failed: {err_msg}")
        except Exception as e:
            if isinstance(e, ValidationError):
                raise
            raise ValidationError(f"NIC IRP Cancel IRN Connection Error: {str(e)}")


def get_irp_client():
    client_id = getattr(settings, "EINVOICE_CLIENT_ID", "")
    client_secret = getattr(settings, "EINVOICE_CLIENT_SECRET", "")
    username = getattr(settings, "EINVOICE_USERNAME", "")
    password = getattr(settings, "EINVOICE_PASSWORD", "")
    base_url = getattr(settings, "EINVOICE_BASE_URL", "https://einv-apisandbox.nic.in")

    if not all([client_id, client_secret, username, password]):
        raise ValueError("E-Invoice (NIC IRP) credentials are not fully configured in settings.")
    return RealIRPClient(base_url, client_id, client_secret, username, password)
