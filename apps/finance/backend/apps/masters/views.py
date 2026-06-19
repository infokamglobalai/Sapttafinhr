from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from datetime import date as _date
from rest_framework import serializers as _s
from rest_framework.views import APIView
from .jurisdictions import JURISDICTIONS
from .models import Account, Branch, Company, CostCenter, ExchangeRate, FiscalYear, HSNCode, Item, NumberSeries, Party, Project, SUPPORTED_CURRENCIES
from .numbering import ensure_defaults, peek_next
from .serializers import (
    AccountSerializer,
    BranchSerializer,
    CompanySerializer,
    CostCenterSerializer,
    FiscalYearSerializer,
    HSNCodeSerializer,
    ItemSerializer,
    NumberSeriesSerializer,
    PartySerializer,
    ProjectSerializer,
)


class CompanyViewSet(viewsets.ModelViewSet):
    queryset = Company.objects.all()
    serializer_class = CompanySerializer
    search_fields = ("name", "gstin")


class BranchViewSet(viewsets.ModelViewSet):
    queryset = Branch.objects.select_related("company").all()
    serializer_class = BranchSerializer
    filterset_fields = ("company",)


class FiscalYearViewSet(viewsets.ModelViewSet):
    queryset = FiscalYear.objects.all()
    serializer_class = FiscalYearSerializer
    filterset_fields = ("company", "is_active", "is_closed")


class AccountViewSet(viewsets.ModelViewSet):
    queryset = Account.objects.select_related("parent", "company").all()
    serializer_class = AccountSerializer
    filterset_fields = ("company", "type", "is_postable", "is_active")
    search_fields = ("code", "name")
    ordering_fields = ("code", "name")
    ordering = ("code",)


class PartyViewSet(viewsets.ModelViewSet):
    queryset = Party.objects.all()
    serializer_class = PartySerializer
    filterset_fields = ("company", "kind", "is_active")
    search_fields = ("name", "gstin", "email", "phone")


class HSNCodeViewSet(viewsets.ModelViewSet):
    queryset = HSNCode.objects.all()
    serializer_class = HSNCodeSerializer
    filterset_fields = ("company",)
    search_fields = ("code", "description")


class CostCenterViewSet(viewsets.ModelViewSet):
    queryset = CostCenter.objects.all()
    serializer_class = CostCenterSerializer
    filterset_fields = ("company", "is_active")
    search_fields = ("code", "name")


class ProjectViewSet(viewsets.ModelViewSet):
    queryset = Project.objects.select_related("customer").all()
    serializer_class = ProjectSerializer
    filterset_fields = ("company", "is_active", "customer")
    search_fields = ("code", "name")


class ItemViewSet(viewsets.ModelViewSet):
    queryset = Item.objects.select_related("hsn").all()
    serializer_class = ItemSerializer
    filterset_fields = ("company", "kind", "is_active")
    search_fields = ("sku", "name")
    ordering_fields = ("name", "sku", "sale_price")
    ordering = ("name",)


class NumberSeriesViewSet(viewsets.ModelViewSet):
    queryset = NumberSeries.objects.select_related("company").all()
    serializer_class = NumberSeriesSerializer
    filterset_fields = ("company", "doc_type", "is_active")
    ordering = ("doc_type",)

    @action(detail=False, methods=["get"])
    def peek(self, request):
        """GET /masters/number-series/peek/?company=&doc_type= → {number} to prefill a form."""
        company_id = request.query_params.get("company")
        doc_type = request.query_params.get("doc_type")
        if not company_id or not doc_type:
            return Response({"detail": "company and doc_type are required"}, status=400)
        try:
            company = Company.objects.get(pk=company_id)
        except Company.DoesNotExist:
            return Response({"detail": "company not found"}, status=404)
        return Response({"doc_type": doc_type, "number": peek_next(company, doc_type)})

    @action(detail=False, methods=["post"])
    def seed_defaults(self, request):
        """POST /masters/number-series/seed_defaults/ {company} → create default series rows."""
        company_id = request.data.get("company")
        try:
            company = Company.objects.get(pk=company_id)
        except Company.DoesNotExist:
            return Response({"detail": "company not found"}, status=404)
        created = ensure_defaults(company)
        return Response({"created": created})


# ── Exchange Rates ────────────────────────────────────────────────────────

class ExchangeRateSerializer(_s.ModelSerializer):
    class Meta:
        model = ExchangeRate
        fields = ["id", "currency", "rate", "date", "source", "created_at"]
        read_only_fields = ["id", "created_at"]


class ExchangeRateView(APIView):
    """GET/POST /masters/exchange-rates/?company=&currency=&date="""

    def get(self, request):
        company_id = request.query_params.get("company")
        currency = request.query_params.get("currency")
        as_of = request.query_params.get("date", _date.today().isoformat())
        if not company_id:
            return Response({"detail": "company required"}, status=400)

        qs = ExchangeRate.objects.filter(company_id=company_id)
        if currency:
            qs = qs.filter(currency=currency)
        qs = qs.filter(date__lte=as_of).order_by("currency", "-date").distinct("currency")
        ser = ExchangeRateSerializer(qs, many=True)
        return Response({
            "rates": ser.data,
            "currencies": [{"code": c, "name": n} for c, n in SUPPORTED_CURRENCIES],
        })

    def post(self, request):
        """Upsert a rate: { company, currency, rate, date }"""
        company_id = request.data.get("company")
        currency = request.data.get("currency")
        rate = request.data.get("rate")
        date_str = request.data.get("date", _date.today().isoformat())
        if not all([company_id, currency, rate]):
            return Response({"detail": "company, currency, rate required"}, status=400)
        obj, created = ExchangeRate.objects.update_or_create(
            company_id=company_id, currency=currency,
            date=_date.fromisoformat(date_str),
            defaults={"rate": rate, "source": request.data.get("source", "manual")},
        )
        return Response(ExchangeRateSerializer(obj).data, status=201 if created else 200)


class JurisdictionsView(APIView):
    """GET /masters/jurisdictions/ → the per-country tax rule sets.

    Drives the Region / Tax Jurisdiction settings dropdown: the client lists
    countries, shows the selected country's rules, and PATCHes the chosen
    country/regime/tax_id/standard_vat_rate onto the company.
    """

    def get(self, request):
        return Response({
            "jurisdictions": [{"country": code, **rules} for code, rules in JURISDICTIONS.items()],
        })
