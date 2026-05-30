from rest_framework.routers import DefaultRouter

from .views import BudgetViewSet, ExpenseClaimViewSet, PettyCashFloatViewSet, PettyCashTxnViewSet

router = DefaultRouter()
router.register("claims", ExpenseClaimViewSet)
router.register("petty-floats", PettyCashFloatViewSet)
router.register("petty-txns", PettyCashTxnViewSet)
router.register("budgets", BudgetViewSet)

urlpatterns = router.urls
