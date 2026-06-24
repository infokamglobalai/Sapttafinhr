from django.urls import path
from rest_framework.routers import DefaultRouter

from .admin_ops import (
    ActiveAnnouncementView,
    AdminAnalyticsView,
    AdminAnnouncementDetailView,
    AdminAnnouncementsView,
    AdminAuditView,
    AdminCompanyDetailView,
    AdminCompanyLifecycleView,
    AdminCompanyNotesView,
    AdminCompanyUsageView,
    AdminCompanyUsersView,
    AdminEntitlementToggleView,
    AdminGenerateInvoiceView,
    AdminImpersonateView,
    AdminInvoiceActionView,
    AdminProvisionCompanyView,
    AdminUserResetPasswordView,
    AdminUserSearchView,
    AdminUserSetActiveView,
    AdminUserSetStaffView,
)
from .admin_revenue import (
    AdminDunningView,
    AdminGstExportView,
    AdminInvoiceExportView,
    AdminRevenueView,
    AdminSubscriptionExtendView,
    AdminSubscriptionRemindView,
)
from .admin_observability import (
    AdminActivityView,
    AdminHealthView,
    AdminJobsView,
    AdminPaymentsView,
)
from .admin_views import AdminCompaniesView, AdminStatsView
from .billing import ConfirmPaymentView, CreateOrderView, DevActivateView, WebhookView
from .internal_billing import billing_snapshot, invoice_detail
from .internal_payroll import payroll_journal
from .signup_views import ProvisioningStatusView, SignupView
from .views import (
    PlanAdminViewSet,
    PlanViewSet,
    SaasInvoiceViewSet,
    SubscriptionEntitlementViewSet,
    SubscriptionViewSet,
)

router = DefaultRouter()
router.register("plans", PlanViewSet)
router.register("subscriptions", SubscriptionViewSet, basename="subscription")
router.register("entitlements", SubscriptionEntitlementViewSet)
router.register("invoices", SaasInvoiceViewSet)
router.register("admin/plans", PlanAdminViewSet, basename="admin-plan")

urlpatterns = [
    path("signup/", SignupView.as_view(), name="saas_signup"),
    path("provisioning-status/", ProvisioningStatusView.as_view(), name="saas_provisioning_status"),
    path("billing/order/", CreateOrderView.as_view(), name="billing_order"),
    path("billing/confirm/", ConfirmPaymentView.as_view(), name="billing_confirm"),
    path("billing/webhook/", WebhookView.as_view(), name="billing_webhook"),
    path("dev/activate/", DevActivateView.as_view(), name="dev_activate"),

    # ── Super-admin platform console (web SPA /superadmin) ──
    # Read
    path("admin/companies/", AdminCompaniesView.as_view(), name="admin_companies"),
    path("admin/stats/", AdminStatsView.as_view(), name="admin_stats"),
    # Server-to-server billing for embedded HR (Bearer SSO_SHARED_SECRET).
    path("internal/billing-snapshot/", billing_snapshot, name="internal_billing_snapshot"),
    path("internal/invoices/<int:invoice_id>/", invoice_detail, name="internal_invoice_detail"),
    path("internal/payroll-journal/", payroll_journal, name="internal_payroll_journal"),
    path("admin/analytics/", AdminAnalyticsView.as_view(), name="admin_analytics"),
    path("admin/audit/", AdminAuditView.as_view(), name="admin_audit"),
    # Phase 9 — observability & platform health
    path("admin/activity/", AdminActivityView.as_view(), name="admin_activity"),
    path("admin/payments/", AdminPaymentsView.as_view(), name="admin_payments"),
    path("admin/health/", AdminHealthView.as_view(), name="admin_health"),
    path("admin/jobs/", AdminJobsView.as_view(), name="admin_jobs"),
    # Phase 8 — revenue & dunning
    path("admin/revenue/", AdminRevenueView.as_view(), name="admin_revenue"),
    path("admin/dunning/", AdminDunningView.as_view(), name="admin_dunning"),
    path("admin/subscriptions/<int:sub_id>/remind/", AdminSubscriptionRemindView.as_view(), name="admin_sub_remind"),
    path("admin/subscriptions/<int:sub_id>/extend/", AdminSubscriptionExtendView.as_view(), name="admin_sub_extend"),
    path("admin/exports/invoices.csv", AdminInvoiceExportView.as_view(), name="admin_export_invoices"),
    path("admin/exports/gst.csv", AdminGstExportView.as_view(), name="admin_export_gst"),
    # Phase 10 — access & governance
    path("admin/users/", AdminUserSearchView.as_view(), name="admin_user_search"),
    path("admin/users/<int:user_id>/set-staff/", AdminUserSetStaffView.as_view(), name="admin_user_set_staff"),
    # Phase 11 — announcements
    path("admin/announcements/", AdminAnnouncementsView.as_view(), name="admin_announcements"),
    path("admin/announcements/<int:pk>/", AdminAnnouncementDetailView.as_view(), name="admin_announcement_detail"),
    path("announcements/active/", ActiveAnnouncementView.as_view(), name="announcements_active"),
    # Provision (POST) — same path as the directory GET, on the detail collection.
    path("admin/companies/new/", AdminProvisionCompanyView.as_view(), name="admin_provision"),
    # Per-company
    path("admin/companies/<str:schema>/", AdminCompanyDetailView.as_view(), name="admin_company_detail"),
    path("admin/companies/<str:schema>/users/", AdminCompanyUsersView.as_view(), name="admin_company_users"),
    path("admin/companies/<str:schema>/usage/", AdminCompanyUsageView.as_view(), name="admin_company_usage"),
    path("admin/companies/<str:schema>/notes/", AdminCompanyNotesView.as_view(), name="admin_company_notes"),
    path("admin/companies/<str:schema>/impersonate/", AdminImpersonateView.as_view(), name="admin_impersonate"),
    path("admin/companies/<str:schema>/lifecycle/", AdminCompanyLifecycleView.as_view(), name="admin_company_lifecycle"),
    path("admin/companies/<str:schema>/invoices/", AdminGenerateInvoiceView.as_view(), name="admin_generate_invoice"),
    # Users
    path("admin/users/<int:user_id>/reset-password/", AdminUserResetPasswordView.as_view(), name="admin_user_reset"),
    path("admin/users/<int:user_id>/set-active/", AdminUserSetActiveView.as_view(), name="admin_user_set_active"),
    # Billing
    path("admin/invoices/<int:invoice_id>/<str:action>/", AdminInvoiceActionView.as_view(), name="admin_invoice_action"),
    path("admin/subscriptions/<int:sub_id>/entitlement/", AdminEntitlementToggleView.as_view(), name="admin_entitlement_toggle"),
] + router.urls
