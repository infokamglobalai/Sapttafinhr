"""Finance first-run setup status + completion.

The Finance app shows a forced setup wizard until the company is marked
setup_complete. The wizard writes the individual sections via the existing
viewsets (company PATCH, branches, fiscal-years, bank-accounts, …); this module
just reports what's still missing and flips the completion flag.
"""
from __future__ import annotations

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Company, FiscalYear


def _company_for(request) -> Company | None:
    return Company.objects.order_by("id").first()


class SetupStatusView(APIView):
    """GET /api/v1/masters/setup/status/ — what's done / still required."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        company = _company_for(request)
        if not company:
            return Response({"setup_complete": False, "company": None, "missing": ["company"]})

        missing = []
        if not company.legal_name:
            missing.append("legal_name")
        is_india = getattr(company, "country", "IN") == "IN" or company.base_currency == "INR"
        if is_india and not company.gstin:
            missing.append("gstin")
        if is_india and not company.state_code:
            missing.append("state_code")
        if not company.pan:
            missing.append("pan")
        if not FiscalYear.objects.filter(company=company, is_active=True).exists():
            missing.append("fiscal_year")
        has_bank = company.bank_accounts.exists() if hasattr(company, "bank_accounts") else False

        return Response({
            "setup_complete": company.setup_complete,
            "company_id": company.id,
            "company_name": company.name,
            "missing": missing,
            "has_fiscal_year": FiscalYear.objects.filter(company=company).exists(),
            "has_bank_account": has_bank,
        })


class SetupCompleteView(APIView):
    """POST /api/v1/masters/setup/complete/ — mark first-run setup done.

    Enforces the minimum required fields so the product is actually usable
    (GSTIN/state drive GST; an active fiscal year is needed to post anything).
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        company = _company_for(request)
        if not company:
            return Response({"detail": "No company to set up."}, status=status.HTTP_400_BAD_REQUEST)

        required_missing = []
        if not company.legal_name:
            required_missing.append("legal_name")
        is_india = getattr(company, "country", "IN") == "IN" or company.base_currency == "INR"
        if is_india and not company.gstin:
            required_missing.append("gstin")
        if is_india and not company.state_code:
            required_missing.append("state_code")
        if not FiscalYear.objects.filter(company=company, is_active=True).exists():
            required_missing.append("fiscal_year")
        if required_missing:
            return Response(
                {"detail": "Setup incomplete.", "missing": required_missing},
                status=status.HTTP_400_BAD_REQUEST,
            )

        company.setup_complete = True
        company.save(update_fields=["setup_complete", "updated_at"])

        # Let the setup-enforcement middleware through immediately on the next
        # request, without waiting for its cache to expire / re-query.
        from django.db import connection

        from apps.saas.middleware import mark_setup_complete

        mark_setup_complete(connection.schema_name)
        return Response({"setup_complete": True, "company_id": company.id})
