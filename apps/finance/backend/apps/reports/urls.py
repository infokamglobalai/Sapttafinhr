from django.urls import path

from .views import (
    ARAgingView,
    AuditLogView,
    BalanceSheetView,
    BudgetVsActualView,
    CashFlowView,
    ConsolidationView,
    CostCenterPnLView,
    DashboardView,
    DayBookView,
    PartyLedgerView,
    PnLView,
    SalesRegisterView,
)

urlpatterns = [
    path("dashboard/", DashboardView.as_view(), name="dashboard"),
    path("pnl/", PnLView.as_view(), name="pnl"),
    path("balance-sheet/", BalanceSheetView.as_view(), name="balance-sheet"),
    path("party-ledger/", PartyLedgerView.as_view(), name="party-ledger"),
    path("ar-aging/", ARAgingView.as_view(), name="ar-aging"),
    path("sales-register/", SalesRegisterView.as_view(), name="sales-register"),
    path("cash-flow/", CashFlowView.as_view(), name="cash-flow"),
    path("day-book/", DayBookView.as_view(), name="day-book"),
    path("cost-center-pnl/", CostCenterPnLView.as_view(), name="cost-center-pnl"),
    path("consolidation/", ConsolidationView.as_view(), name="consolidation"),
    path("budget-vs-actual/", BudgetVsActualView.as_view(), name="budget-vs-actual"),
    path("audit-log/", AuditLogView.as_view(), name="audit-log"),
]
