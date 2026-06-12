from datetime import date as _date
import base64
import hashlib
import json
import random
from datetime import timedelta
from django.utils import timezone
from django.conf import settings
from cryptography.fernet import Fernet

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from .integrations.razorpay import get_razorpay
from .models import Advance, BankAccount, BankStatement, BankStatementLine, FXRate, PostDatedCheque, BankCredential
from .serializers import (
    AdvanceSerializer,
    BankAccountSerializer,
    BankStatementLineSer,
    BankStatementSer,
    FXRateSerializer,
    PDCSerializer,
)
from . import services


def get_fernet_cipher():
    key = getattr(settings, "SECRET_KEY", "insecure-fallback-key")
    derived_key = base64.urlsafe_b64encode(hashlib.sha256(key.encode()).digest())
    return Fernet(derived_key)

def encrypt_credentials(data: dict) -> str:
    cipher = get_fernet_cipher()
    plain_text = json.dumps(data)
    return cipher.encrypt(plain_text.encode()).decode()

def decrypt_credentials(encrypted_str: str) -> dict:
    cipher = get_fernet_cipher()
    decrypted_bytes = cipher.decrypt(encrypted_str.encode())
    return json.loads(decrypted_bytes.decode())


class BankAccountViewSet(viewsets.ModelViewSet):
    queryset = BankAccount.objects.select_related("ledger_account").all()
    serializer_class = BankAccountSerializer
    filterset_fields = ("company", "is_active", "currency")


class BankStatementViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = BankStatement.objects.prefetch_related("lines").all()
    serializer_class = BankStatementSer
    filterset_fields = ("bank_account",)


class BankStatementLineViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = BankStatementLine.objects.select_related("statement").all()
    serializer_class = BankStatementLineSer
    filterset_fields = ("statement", "status")


class ImportStatementView(APIView):
    parser_classes = [MultiPartParser]

    def post(self, request):
        bank_id = int(request.data.get("bank_account"))
        bank = BankAccount.objects.get(pk=bank_id)
        file = request.FILES.get("file")
        if not file:
            raise ValidationError({"file": "required"})
        stmt = services.import_statement(
            bank_account=bank, file_bytes=file.read(),
            period_start=_date.fromisoformat(request.data["period_start"]),
            period_end=_date.fromisoformat(request.data["period_end"]),
            opening=request.data.get("opening", "0"),
            closing=request.data.get("closing", "0"),
        )
        # Auto-run reconciliation immediately so the user lands on a matched-up table.
        match_result = services.auto_reconcile(bank)

        data = BankStatementSer(stmt).data
        data["auto_reconcile"] = match_result
        return Response(data, status=status.HTTP_201_CREATED)


class ReconcileView(APIView):
    def post(self, request, bank_id):
        bank = BankAccount.objects.get(pk=bank_id)
        return Response(services.auto_reconcile(bank))


class AIReconcileView(APIView):
    """POST /api/v1/banking/bank-accounts/<id>/ai-reconcile/
    Runs AI-powered reconciliation for unmatched statement lines.
    Body (optional): {dry_run: true} — preview matches without saving.
    """
    def post(self, request, bank_id):
        bank = BankAccount.objects.get(pk=bank_id)
        dry_run = bool(request.data.get("dry_run", False))
        from .ai_reconcile import ai_reconcile
        result = ai_reconcile(bank, dry_run=dry_run)
        return Response(result)


class SyncBankFeedView(APIView):
    """POST /api/v1/banking/bank-accounts/<id>/sync-feed/
    Synchronizes live connected banking feeds from ICICI/HDFC/Axis/SBI, then runs auto-reconciliation.
    """
    def post(self, request, bank_id):
        bank = BankAccount.objects.get(pk=bank_id)
        stmt = services.sync_live_feed(bank)
        match_result = services.auto_reconcile(bank)
        
        from .serializers import BankStatementSer
        data = BankStatementSer(stmt).data
        data["auto_reconcile"] = match_result
        return Response(data, status=status.HTTP_200_OK)



class PDCViewSet(viewsets.ModelViewSet):
    queryset = PostDatedCheque.objects.select_related("party", "bank_account").all()
    serializer_class = PDCSerializer
    filterset_fields = ("company", "direction", "status", "party")
    ordering = ("cheque_date",)


class AdvanceViewSet(viewsets.ModelViewSet):
    queryset = Advance.objects.select_related("party").all()
    serializer_class = AdvanceSerializer
    filterset_fields = ("company", "kind", "party")


class FXRateViewSet(viewsets.ModelViewSet):
    queryset = FXRate.objects.all()
    serializer_class = FXRateSerializer
    filterset_fields = ("company", "currency", "date")


class CreatePaymentLinkView(APIView):
    """POST /api/v1/banking/payment-link/  body: { invoice_id, amount, description }"""
    def post(self, request):
        rzp = get_razorpay()
        link = rzp.create_payment_link(
            amount=int(float(request.data["amount"]) * 100),
            currency=request.data.get("currency", "INR"),
            description=request.data.get("description", ""),
            reference_id=str(request.data["invoice_id"]),
        )
        return Response({"id": link.id, "short_url": link.short_url, "status": link.status})


class RazorpayWebhookView(APIView):
    """POST /api/v1/banking/webhooks/razorpay/  — HMAC-verified in real integration."""
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        rzp = get_razorpay()
        sig = request.headers.get("X-Razorpay-Signature", "")
        webhook_secret = getattr(settings, "RAZORPAY_WEBHOOK_SECRET", "")
        if not rzp.verify_webhook(request.body, sig, webhook_secret):
            return Response({"detail": "invalid signature"}, status=400)
        # Stub: just acknowledge.
        return Response({"ok": True})


class RequestOTPCredentialView(APIView):
    """POST /api/v1/banking/bank-accounts/<id>/credentials/request-otp/
    Generates a secure 6-digit OTP and logs it (simulating email/SMS dispatch).
    """
    def post(self, request, bank_id):
        bank = BankAccount.objects.get(pk=bank_id)
        cred, _ = BankCredential.objects.get_or_create(bank_account=bank)
        
        otp = f"{random.randint(100000, 999999)}"
        cred.otp_code = otp
        cred.otp_expires_at = timezone.now() + timedelta(minutes=5)
        cred.save(update_fields=["otp_code", "otp_expires_at"])
        
        print(f"============================================================")
        print(f" SECURITY OTP FOR VIEWING/EDITING {bank.bank_name} CREDENTIALS: {otp}")
        print(f"============================================================")
        
        return Response({"detail": "OTP sent successfully. Please verify to view or edit banking keys."}, status=status.HTTP_200_OK)


class VerifyOTPCredentialView(APIView):
    """POST /api/v1/banking/bank-accounts/<id>/credentials/verify-otp/
    Verifies the OTP and returns the decrypted credentials if valid.
    """
    def post(self, request, bank_id):
        bank = BankAccount.objects.get(pk=bank_id)
        otp = request.data.get("otp")
        if not otp:
            raise ValidationError({"otp": "This field is required."})

        try:
            cred = BankCredential.objects.get(bank_account=bank)
        except BankCredential.DoesNotExist:
            raise ValidationError({"otp": "No credentials registered. Please request OTP first."})

        if cred.otp_code != otp or timezone.now() > cred.otp_expires_at:
            raise ValidationError({"otp": "Invalid or expired OTP."})

        keys = {}
        if cred.encrypted_data:
            try:
                keys = decrypt_credentials(cred.encrypted_data)
            except Exception as e:
                raise ValidationError({"detail": f"Decryption failed: {e}"})

        return Response({"verified": True, "credentials": keys}, status=status.HTTP_200_OK)


class SaveCredentialView(APIView):
    """POST /api/v1/banking/bank-accounts/<id>/credentials/
    Verifies the OTP and encrypts/saves the bank account credentials.
    """
    def post(self, request, bank_id):
        bank = BankAccount.objects.get(pk=bank_id)
        otp = request.data.get("otp")
        credentials_data = request.data.get("credentials")

        if not otp:
            raise ValidationError({"otp": "This field is required."})
        if not isinstance(credentials_data, dict):
            raise ValidationError({"credentials": "Must be a key-value object."})

        try:
            cred = BankCredential.objects.get(bank_account=bank)
        except BankCredential.DoesNotExist:
            raise ValidationError({"otp": "No active OTP request found."})

        if cred.otp_code != otp or timezone.now() > cred.otp_expires_at:
            raise ValidationError({"otp": "Invalid or expired OTP."})

        try:
            encrypted_str = encrypt_credentials(credentials_data)
        except Exception as e:
            raise ValidationError({"detail": f"Encryption failed: {e}"})

        cred.encrypted_data = encrypted_str
        cred.otp_code = ""
        cred.otp_expires_at = None
        cred.save(update_fields=["encrypted_data", "otp_code", "otp_expires_at"])

        return Response({"detail": "Credentials updated successfully."}, status=status.HTTP_200_OK)


class InitiatePayoutView(APIView):
    """POST /api/v1/banking/bank-accounts/<id>/payout/
    Initiates a payout transfer to a beneficiary via connected banking APIs.
    """
    def post(self, request, bank_id):
        bank = BankAccount.objects.get(pk=bank_id)
        beneficiary_account = request.data.get("beneficiary_account")
        beneficiary_ifsc = request.data.get("beneficiary_ifsc")
        amount_val = request.data.get("amount")
        narration = request.data.get("narration") or "Payout"

        # Basic validation
        if not beneficiary_account:
            raise ValidationError({"beneficiary_account": "This field is required."})
        if not beneficiary_ifsc:
            raise ValidationError({"beneficiary_ifsc": "This field is required."})
        if not amount_val:
            raise ValidationError({"amount": "This field is required."})
        try:
            amount = float(amount_val)
            if amount <= 0:
                raise ValueError
        except ValueError:
            raise ValidationError({"amount": "Must be a positive number."})

        # Load credentials
        db_creds = services.get_bank_credentials(bank)
        import os
        bank_name_lower = bank.bank_name.lower()

        if "icici" in bank_name_lower:
            corp_id = db_creds.get("corp_id") or os.environ.get("ICICI_CORP_ID")
            user_id = db_creds.get("user_id") or os.environ.get("ICICI_USER_ID")
            client_id = db_creds.get("client_id") or os.environ.get("ICICI_CLIENT_ID")
            client_secret = db_creds.get("client_secret") or os.environ.get("ICICI_CLIENT_SECRET")
            api_key = db_creds.get("api_key") or os.environ.get("ICICI_API_KEY")
            private_key = db_creds.get("private_key") or os.environ.get("ICICI_PRIVATE_KEY")
            
            missing = [k for k, v in [
                ("ICICI_CORP_ID", corp_id),
                ("ICICI_USER_ID", user_id),
                ("ICICI_CLIENT_ID", client_id),
                ("ICICI_CLIENT_SECRET", client_secret),
                ("ICICI_API_KEY", api_key),
                ("ICICI_PRIVATE_KEY", private_key)
            ] if not v]
            if missing:
                raise ValidationError({"detail": f"Configure missing ICICI credentials in your .env or DB: {', '.join(missing)}"})
            
            from .integrations.icici import ICICIConnectedBankingClient
            client = ICICIConnectedBankingClient(
                corp_id=corp_id, user_id=user_id, client_id=client_id,
                client_secret=client_secret, api_key=api_key, private_key_str=private_key
            )
            
        elif "hdfc" in bank_name_lower:
            corp_id = db_creds.get("corp_id") or os.environ.get("HDFC_CORP_ID")
            user_id = db_creds.get("user_id") or os.environ.get("HDFC_USER_ID")
            client_id = db_creds.get("client_id") or os.environ.get("HDFC_CLIENT_ID")
            client_secret = db_creds.get("client_secret") or os.environ.get("HDFC_CLIENT_SECRET")
            
            missing = [k for k, v in [
                ("HDFC_CORP_ID", corp_id),
                ("HDFC_USER_ID", user_id),
                ("HDFC_CLIENT_ID", client_id),
                ("HDFC_CLIENT_SECRET", client_secret)
            ] if not v]
            if missing:
                raise ValidationError({"detail": f"Configure missing HDFC credentials in your .env or DB: {', '.join(missing)}"})
            
            from .integrations.hdfc import HDFCConnectedBankingClient
            client = HDFCConnectedBankingClient(
                corp_id=corp_id, user_id=user_id, client_id=client_id, client_secret=client_secret
            )

        elif "axis" in bank_name_lower:
            corp_id = db_creds.get("corp_id") or os.environ.get("AXIS_CORP_ID")
            user_id = db_creds.get("user_id") or os.environ.get("AXIS_USER_ID")
            client_id = db_creds.get("client_id") or os.environ.get("AXIS_CLIENT_ID")
            client_secret = db_creds.get("client_secret") or os.environ.get("AXIS_CLIENT_SECRET")
            private_key = db_creds.get("private_key") or os.environ.get("AXIS_PRIVATE_KEY")
            
            missing = [k for k, v in [
                ("AXIS_CORP_ID", corp_id),
                ("AXIS_USER_ID", user_id),
                ("AXIS_CLIENT_ID", client_id),
                ("AXIS_CLIENT_SECRET", client_secret),
                ("AXIS_PRIVATE_KEY", private_key)
            ] if not v]
            if missing:
                raise ValidationError({"detail": f"Configure missing Axis credentials in your .env or DB: {', '.join(missing)}"})
            
            from .integrations.axis import AxisConnectedBankingClient
            client = AxisConnectedBankingClient(
                corp_id=corp_id, user_id=user_id, client_id=client_id,
                client_secret=client_secret, private_key_str=private_key
            )

        elif "sbi" in bank_name_lower or "state bank" in bank_name_lower:
            corp_id = db_creds.get("corp_id") or os.environ.get("SBI_CORP_ID")
            user_id = db_creds.get("user_id") or os.environ.get("SBI_USER_ID")
            client_id = db_creds.get("client_id") or os.environ.get("SBI_CLIENT_ID")
            client_secret = db_creds.get("client_secret") or os.environ.get("SBI_CLIENT_SECRET")
            
            missing = [k for k, v in [
                ("SBI_CORP_ID", corp_id),
                ("SBI_USER_ID", user_id),
                ("SBI_CLIENT_ID", client_id),
                ("SBI_CLIENT_SECRET", client_secret)
            ] if not v]
            if missing:
                raise ValidationError({"detail": f"Configure missing SBI credentials in your .env or DB: {', '.join(missing)}"})
            
            from .integrations.sbi import SBIConnectedBankingClient
            client = SBIConnectedBankingClient(
                corp_id=corp_id, user_id=user_id, client_id=client_id, client_secret=client_secret
            )
        else:
            raise ValidationError({"detail": f"Connected banking payouts are not supported for bank: '{bank.bank_name}'. Supported banks: ICICI, HDFC, Axis, SBI."})

        # Fire request to the bank API
        resp = client.initiate_payout(
            account_number=bank.account_number,
            beneficiary_account=beneficiary_account,
            beneficiary_ifsc=beneficiary_ifsc,
            amount=amount,
            narration=narration,
        )

        return Response(resp, status=status.HTTP_200_OK)
