import hmac
import hashlib
from decimal import Decimal

import razorpay
from django.conf import settings
from django.db import transaction
from django.utils import timezone
from rest_framework import viewsets
from rest_framework import serializers as drf_serializers
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.billing.models import Invoice

from .models import PortalAccess


class PortalAccessSer(drf_serializers.ModelSerializer):
    party_name = drf_serializers.CharField(source="party.name", read_only=True)
    class Meta:
        model = PortalAccess
        fields = "__all__"
        read_only_fields = ("token", "last_login_at")


class PortalAccessViewSet(viewsets.ModelViewSet):
    queryset = PortalAccess.objects.select_related("party").all()
    serializer_class = PortalAccessSer
    filterset_fields = ("is_active", "party")


class PortalInvoicesView(APIView):
    """GET /api/v1/portal/invoices/?token=...  — public, list customer's invoices."""
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        token = request.query_params.get("token")
        if not token:
            return Response({"detail": "token required"}, status=400)
        try:
            access = PortalAccess.objects.select_related("party").get(token=token, is_active=True)
        except PortalAccess.DoesNotExist:
            return Response({"detail": "invalid token"}, status=403)

        # Record the visit so admins can see when a customer last opened their portal.
        PortalAccess.objects.filter(pk=access.pk).update(last_login_at=timezone.now())

        invoices = Invoice.objects.filter(customer=access.party, status=Invoice.Status.POSTED).order_by("-date")
        return Response({
            "party": {"id": access.party.id, "name": access.party.name},
            "invoices": [
                {
                    "id": i.id, "invoice_no": i.invoice_no, "date": i.date.isoformat(),
                    "due_date": i.due_date.isoformat() if i.due_date else None,
                    "grand_total": str(i.grand_total),
                    "balance_due": str(i.balance_due),
                    "is_paid": i.is_paid,
                }
                for i in invoices
            ],
        })


def get_razorpay_client():
    if getattr(settings, "RAZORPAY_KEY_ID", None) and getattr(settings, "RAZORPAY_KEY_SECRET", None):
        return razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
    return None


class RazorpayCreateOrderView(APIView):
    """POST /api/v1/portal/razorpay/create-order/"""
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        token = request.data.get("token")
        invoice_id = request.data.get("invoice_id")
        
        if not token or not invoice_id:
            return Response({"detail": "token and invoice_id required"}, status=400)
            
        try:
            access = PortalAccess.objects.select_related("party").get(token=token, is_active=True)
        except PortalAccess.DoesNotExist:
            return Response({"detail": "invalid token"}, status=403)
            
        try:
            invoice = Invoice.objects.get(id=invoice_id, customer=access.party, status=Invoice.Status.POSTED)
        except Invoice.DoesNotExist:
            return Response({"detail": "invoice not found"}, status=404)
            
        if invoice.is_paid or invoice.balance_due <= 0:
            return Response({"detail": "invoice is already paid"}, status=400)
            
        client = get_razorpay_client()
        if not client:
            return Response({"detail": "Razorpay not configured on server"}, status=500)
            
        amount_in_paise = int(invoice.balance_due * 100)
        if amount_in_paise < 100:
            return Response({"detail": "Amount must be at least 1.00 INR"}, status=400)
            
        try:
            order = client.order.create({
                "amount": amount_in_paise,
                "currency": "INR",
                "receipt": str(invoice.id)
            })
            return Response(order)
        except Exception as e:
            return Response({"detail": str(e)}, status=500)


class RazorpayVerifySignatureView(APIView):
    """POST /api/v1/portal/razorpay/verify-signature/"""
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        token = request.data.get("token")
        invoice_id = request.data.get("invoice_id")
        payment_id = request.data.get("razorpay_payment_id")
        order_id = request.data.get("razorpay_order_id")
        signature = request.data.get("razorpay_signature")
        
        if not all([token, invoice_id, payment_id, order_id, signature]):
            return Response({"detail": "missing required fields"}, status=400)
            
        try:
            access = PortalAccess.objects.select_related("party").get(token=token, is_active=True)
        except PortalAccess.DoesNotExist:
            return Response({"detail": "invalid token"}, status=403)
            
        try:
            invoice = Invoice.objects.get(id=invoice_id, customer=access.party)
        except Invoice.DoesNotExist:
            return Response({"detail": "invoice not found"}, status=404)
            
        secret = getattr(settings, "RAZORPAY_KEY_SECRET", None)
        if not secret:
            return Response({"detail": "Razorpay not configured"}, status=500)
            
        # Verify signature
        generated_signature = hmac.new(
            secret.encode(),
            f"{order_id}|{payment_id}".encode(),
            hashlib.sha256
        ).hexdigest()
        
        if generated_signature != signature:
            return Response({"detail": "signature mismatch"}, status=400)
            
        # Signature valid. Mark invoice as paid
        from apps.payments.models import Receipt, ReceiptAllocation
        from apps.masters.models import Account
        
        with transaction.atomic():
            invoice = Invoice.objects.select_for_update().get(id=invoice_id)
            if invoice.is_paid:
                return Response({"detail": "invoice already paid"})
                
            deposit_account = Account.objects.filter(company=invoice.company, type="ASSET").first()
            if not deposit_account:
                return Response({"detail": "No asset account found to deposit into"}, status=500)
                
            amount = invoice.balance_due
            receipt = Receipt.objects.create(
                company=invoice.company,
                fiscal_year=invoice.fiscal_year,
                receipt_no=f"RZP-{payment_id[:10].upper()}",
                date=timezone.now().date(),
                customer=invoice.customer,
                mode=Receipt.Mode.BANK,
                reference=payment_id,
                amount=amount,
                notes=f"Razorpay payment {payment_id}",
                status=Receipt.Status.POSTED,
                deposit_account=deposit_account
            )
            ReceiptAllocation.objects.create(
                receipt=receipt,
                invoice=invoice,
                amount=amount
            )
            invoice.amount_paid += amount
            invoice.balance_due -= amount
            if invoice.balance_due <= 0:
                invoice.is_paid = True
            invoice.save()
            
        return Response({"detail": "payment verified and captured"})
