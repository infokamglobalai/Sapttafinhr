from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import PortalAccessViewSet, PortalInvoicesView

router = DefaultRouter()
router.register("access", PortalAccessViewSet)

urlpatterns = [
    path("invoices/", PortalInvoicesView.as_view()),
] + router.urls
