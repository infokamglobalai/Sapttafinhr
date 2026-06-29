"""Master-data import endpoints: download a template, dry-run, or commit a CSV."""
import csv

from django.http import HttpResponse
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from .imports import ENTITIES, parse_csv, run_import, template_csv
from .models import Company, FiscalYear
from .opening_balances import opening_template_csv, run_opening_balances


def _entity_or_none(request) -> str | None:
    entity = (request.query_params.get("entity") or request.data.get("entity") or "").strip().lower()
    return entity if entity in ENTITIES else None


class MasterImportTemplateView(APIView):
    """GET /masters/import/template/?entity=party → a CSV template to fill in."""

    def get(self, request):
        entity = _entity_or_none(request)
        if not entity:
            return Response(
                {"detail": f"Unknown entity. Choose one of: {', '.join(ENTITIES)}."},
                status=400,
            )
        resp = HttpResponse(template_csv(entity), content_type="text/csv")
        resp["Content-Disposition"] = f'attachment; filename="{entity}_import_template.csv"'
        return resp


class MasterImportView(APIView):
    """POST /masters/import/?entity=party&company=<id>&commit=false (multipart 'file').

    Dry-run by default: validates each row and previews what would be created.
    Pass commit=true to write the clean rows in one transaction.
    """

    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        entity = _entity_or_none(request)
        if not entity:
            return Response(
                {"detail": f"Unknown entity. Choose one of: {', '.join(ENTITIES)}."},
                status=400,
            )

        company_id = request.query_params.get("company") or request.data.get("company")
        try:
            company = Company.objects.get(pk=company_id)
        except (Company.DoesNotExist, ValueError, TypeError):
            return Response({"detail": "company not found"}, status=404)

        upload = request.FILES.get("file")
        if upload is None:
            return Response({"detail": "No file uploaded (field 'file')."}, status=400)

        try:
            rows = parse_csv(upload)
        except (UnicodeDecodeError, csv.Error) as exc:
            return Response({"detail": f"Could not parse CSV: {exc}"}, status=400)
        if not rows:
            return Response({"detail": "The file has no data rows."}, status=400)

        commit_raw = str(request.query_params.get("commit") or request.data.get("commit") or "")
        commit = commit_raw.lower() in {"1", "true", "yes"}

        report = run_import(company=company, entity_key=entity, rows=rows, commit=commit)
        return Response(report)


class OpeningBalanceTemplateView(APIView):
    """GET /masters/import/opening-balances/template/ → a trial-balance CSV template."""

    def get(self, request):
        resp = HttpResponse(opening_template_csv(), content_type="text/csv")
        resp["Content-Disposition"] = 'attachment; filename="opening_balances_template.csv"'
        return resp


class OpeningBalanceImportView(APIView):
    """POST /masters/import/opening-balances/?company=<id>&commit=false (multipart 'file').

    Dry-run previews the trial balance and checks it balances (ΣDr == ΣCr).
    Commit posts a single opening journal entry dated at the fiscal-year start.
    """

    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        company_id = request.query_params.get("company") or request.data.get("company")
        try:
            company = Company.objects.get(pk=company_id)
        except (Company.DoesNotExist, ValueError, TypeError):
            return Response({"detail": "company not found"}, status=404)

        fy = (
            FiscalYear.objects.filter(company=company, is_active=True)
            .order_by("-start_date")
            .first()
        )
        if fy is None:
            return Response(
                {"detail": "No active fiscal year. Create one before importing opening balances."},
                status=400,
            )

        upload = request.FILES.get("file")
        if upload is None:
            return Response({"detail": "No file uploaded (field 'file')."}, status=400)
        try:
            rows = parse_csv(upload)
        except (UnicodeDecodeError, csv.Error) as exc:
            return Response({"detail": f"Could not parse CSV: {exc}"}, status=400)
        if not rows:
            return Response({"detail": "The file has no data rows."}, status=400)

        commit_raw = str(request.query_params.get("commit") or request.data.get("commit") or "")
        commit = commit_raw.lower() in {"1", "true", "yes"}

        report = run_opening_balances(
            company=company, fiscal_year=fy, rows=rows, commit=commit, user=request.user
        )
        return Response(report)
