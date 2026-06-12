from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    AdvanceViewSet,
    AIReconcileView,
    BankAccountViewSet,
    BankStatementLineViewSet,
    BankStatementViewSet,
    CreatePaymentLinkView,
    FXRateViewSet,
    ImportStatementView,
    PDCViewSet,
    RazorpayWebhookView,
    ReconcileView,
    SyncBankFeedView,
    RequestOTPCredentialView,
    VerifyOTPCredentialView,
    SaveCredentialView,
    InitiatePayoutView,
)

router = DefaultRouter()
router.register("bank-accounts", BankAccountViewSet)
router.register("statements", BankStatementViewSet)
router.register("statement-lines", BankStatementLineViewSet)
router.register("pdcs", PDCViewSet)
router.register("advances", AdvanceViewSet)
router.register("fx-rates", FXRateViewSet)

urlpatterns = [
    path("statements/import/", ImportStatementView.as_view()),
    path("bank-accounts/<int:bank_id>/reconcile/", ReconcileView.as_view()),
    path("bank-accounts/<int:bank_id>/ai-reconcile/", AIReconcileView.as_view()),
    path("bank-accounts/<int:bank_id>/sync-feed/", SyncBankFeedView.as_view()),
    path("bank-accounts/<int:bank_id>/credentials/request-otp/", RequestOTPCredentialView.as_view()),
    path("bank-accounts/<int:bank_id>/credentials/verify-otp/", VerifyOTPCredentialView.as_view()),
    path("bank-accounts/<int:bank_id>/credentials/", SaveCredentialView.as_view()),
    path("bank-accounts/<int:bank_id>/payout/", InitiatePayoutView.as_view()),
    path("payment-link/", CreatePaymentLinkView.as_view()),
    path("webhooks/razorpay/", RazorpayWebhookView.as_view()),
] + router.urls
