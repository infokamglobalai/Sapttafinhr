from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .jwt import SapttaTokenObtainPairView
from .views import MeView

urlpatterns = [
    path("login/", SapttaTokenObtainPairView.as_view(), name="token_obtain"),
    path("refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("me/", MeView.as_view(), name="me"),
]
