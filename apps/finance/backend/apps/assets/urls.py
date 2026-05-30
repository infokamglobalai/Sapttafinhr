from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import DepreciationViewSet, FixedAssetViewSet, RunDepreciationView

router = DefaultRouter()
router.register("fixed-assets", FixedAssetViewSet)
router.register("depreciation-entries", DepreciationViewSet)

urlpatterns = [
    path("run-depreciation/", RunDepreciationView.as_view()),
] + router.urls
