"""API views for client SOW / contract documents."""
from django.http import HttpResponse
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from .client_documents import (
    finalize_document,
    render_document_pdf,
    seed_default_client_doc_templates,
    update_document_body,
)
from .models import ClientDocument, ClientDocumentTemplate
from .serializers import (
    ClientDocumentBodySerializer,
    ClientDocumentFromQuotationSerializer,
    ClientDocumentReadSerializer,
    ClientDocumentTemplateSerializer,
)


class ClientDocumentTemplateViewSet(viewsets.ModelViewSet):
    queryset = ClientDocumentTemplate.objects.all()
    serializer_class = ClientDocumentTemplateSerializer
    filterset_fields = ("company", "doc_type", "is_active")
    search_fields = ("name",)
    ordering = ("doc_type", "name")

    @action(detail=False, methods=["post"])
    def seed(self, request):
        company_id = request.data.get("company")
        if not company_id:
            return Response({"detail": "company required"}, status=400)
        from apps.masters.models import Company

        company = Company.objects.filter(pk=company_id).first()
        if not company:
            return Response({"detail": "Company not found"}, status=404)
        created, skipped = seed_default_client_doc_templates(company)
        return Response({"created": created, "skipped": skipped})


class ClientDocumentViewSet(viewsets.ModelViewSet):
    queryset = ClientDocument.objects.select_related(
        "customer", "template", "quotation", "sales_order"
    ).all()
    serializer_class = ClientDocumentReadSerializer
    filterset_fields = ("company", "customer", "doc_type", "status", "quotation")
    search_fields = ("doc_no", "title", "customer__name")
    ordering = ("-created_at",)
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_queryset(self):
        qs = super().get_queryset()
        return qs

    @action(detail=True, methods=["post"])
    def finalize(self, request, pk=None):
        doc = self.get_object()
        try:
            finalize_document(doc)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=400)
        return Response(ClientDocumentReadSerializer(doc).data)

    @action(detail=True, methods=["get"])
    def pdf(self, request, pk=None):
        doc = self.get_object()
        pdf = render_document_pdf(doc)
        if pdf[:4] == b"%PDF":
            resp = HttpResponse(pdf, content_type="application/pdf")
            resp["Content-Disposition"] = f'attachment; filename="{doc.doc_no}.pdf"'
            return resp
        return HttpResponse(pdf, content_type="text/html; charset=utf-8")

    @action(detail=True, methods=["post"])
    def body(self, request, pk=None):
        doc = self.get_object()
        ser = ClientDocumentBodySerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        try:
            update_document_body(doc, ser.validated_data["body_html"])
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=400)
        return Response(ClientDocumentReadSerializer(doc).data)


class ClientDocumentFromQuotationView(APIView):
    def post(self, request):
        ser = ClientDocumentFromQuotationSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        doc = ser.save()
        return Response(ClientDocumentReadSerializer(doc).data, status=status.HTTP_201_CREATED)
