from datetime import date as _date

from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from . import queries


def _company(request):
    company = request.query_params.get("company")
    if not company:
        raise ValidationError({"company": "required"})
    return int(company)


def _date_or(default, key, request):
    raw = request.query_params.get(key)
    if not raw:
        return default
    return _date.fromisoformat(raw)


class PnLView(APIView):
    def get(self, request):
        company = _company(request)
        today = _date.today()
        start = _date_or(today.replace(day=1, month=4), "start", request)
        end = _date_or(today, "end", request)
        return Response(queries.profit_and_loss(company, start, end))


class BalanceSheetView(APIView):
    def get(self, request):
        company = _company(request)
        as_of = _date_or(_date.today(), "as_of", request)
        return Response(queries.balance_sheet(company, as_of))


class PartyLedgerView(APIView):
    def get(self, request):
        company = _company(request)
        party = request.query_params.get("party")
        if not party:
            raise ValidationError({"party": "required"})
        today = _date.today()
        start = _date_or(today.replace(day=1, month=4), "start", request)
        end = _date_or(today, "end", request)
        return Response(queries.party_ledger(company, int(party), start, end))


class ARAgingView(APIView):
    def get(self, request):
        company = _company(request)
        as_of = _date_or(_date.today(), "as_of", request)
        return Response(queries.ar_aging(company, as_of))


class SalesRegisterView(APIView):
    def get(self, request):
        company = _company(request)
        today = _date.today()
        start = _date_or(today.replace(day=1, month=4), "start", request)
        end = _date_or(today, "end", request)
        return Response(queries.sales_register(company, start, end))


class DashboardView(APIView):
    def get(self, request):
        company = _company(request)
        today = _date.today()
        return Response(queries.dashboard(company, today))


class CashFlowView(APIView):
    def get(self, request):
        company = _company(request)
        today = _date.today()
        start = _date_or(today.replace(day=1, month=4), "start", request)
        end = _date_or(today, "end", request)
        return Response(queries.cash_flow(company, start, end))


class DayBookView(APIView):
    def get(self, request):
        company = _company(request)
        on = _date_or(_date.today(), "date", request)
        return Response({"date": on.isoformat(), "rows": queries.day_book(company, on)})


class CostCenterPnLView(APIView):
    def get(self, request):
        company = _company(request)
        today = _date.today()
        start = _date_or(today.replace(day=1, month=4), "start", request)
        end = _date_or(today, "end", request)
        return Response({"rows": queries.cost_center_pnl(company, start, end)})


class ConsolidationView(APIView):
    def get(self, request):
        ids_raw = request.query_params.get("companies", "")
        if not ids_raw:
            raise ValidationError({"companies": "comma-separated company ids required"})
        ids = [int(x) for x in ids_raw.split(",")]
        today = _date.today()
        start = _date_or(today.replace(day=1, month=4), "start", request)
        end = _date_or(today, "end", request)
        return Response(queries.consolidation_pnl(ids, start, end))


class BudgetVsActualView(APIView):
    def get(self, request):
        company = _company(request)
        fy = request.query_params.get("fiscal_year")
        if not fy:
            raise ValidationError({"fiscal_year": "required"})
        return Response({"rows": queries.budget_vs_actual(company, int(fy))})


class AuditLogView(APIView):
    def get(self, request):
        company = _company(request)
        return Response({"rows": queries.audit_log(company)})
