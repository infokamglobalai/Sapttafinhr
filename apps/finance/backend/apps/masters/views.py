from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Account, Branch, Company, CostCenter, FiscalYear, HSNCode, Item, NumberSeries, Party, Project
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
