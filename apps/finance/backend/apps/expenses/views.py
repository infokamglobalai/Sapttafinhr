from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Budget, ExpenseClaim, PettyCashFloat, PettyCashTransaction
from .serializers import BudgetSer, ExpenseClaimSer, PettyFloatSer, PettyTxnSer
from . import services


class ExpenseClaimViewSet(viewsets.ModelViewSet):
    queryset = ExpenseClaim.objects.select_related("employee", "approved_by").prefetch_related("lines").all()
    serializer_class = ExpenseClaimSer
    filterset_fields = ("company", "employee", "status")

    @action(detail=True, methods=["post"])
    def submit(self, request, pk=None):
        return Response(ExpenseClaimSer(services.submit_claim(self.get_object())).data)

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        return Response(ExpenseClaimSer(
            services.approve_claim(self.get_object(), approver=request.user)
        ).data)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        return Response(ExpenseClaimSer(
            services.reject_claim(self.get_object(), reason=request.data.get("reason", ""))
        ).data)


class PettyCashFloatViewSet(viewsets.ModelViewSet):
    queryset = PettyCashFloat.objects.select_related("custodian", "cash_account").all()
    serializer_class = PettyFloatSer
    filterset_fields = ("company", "custodian", "is_active")


class PettyCashTxnViewSet(viewsets.ModelViewSet):
    queryset = PettyCashTransaction.objects.all()
    serializer_class = PettyTxnSer
    filterset_fields = ("float_account", "kind")


class BudgetViewSet(viewsets.ModelViewSet):
    queryset = Budget.objects.select_related("account", "cost_center").all()
    serializer_class = BudgetSer
    filterset_fields = ("company", "fiscal_year", "account", "cost_center", "period")
