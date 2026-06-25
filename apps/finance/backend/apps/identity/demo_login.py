from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from apps.identity.models import User


class DemoLoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        try:
            user = User.objects.get(email="demo@saptta.com")
        except User.DoesNotExist:
            return Response(
                {"detail": "Demo user is not provisioned on the platform. Please run migrations/seeding."},
                status=status.HTTP_404_NOT_FOUND
            )

        if not user.is_active:
            return Response(
                {"detail": "Demo user is suspended."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Generate JWT refresh and access tokens
        refresh = RefreshToken.for_user(user)
        # Custom claims expected by front-end / verify token functions
        refresh["email"] = user.email
        refresh["full_name"] = getattr(user, "full_name", "")

        return Response({
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "workspace": "demo",
            "products": ["finance", "hrms"],
            "user": {
                "id": user.id,
                "email": user.email,
                "full_name": getattr(user, "full_name", ""),
                "is_staff": user.is_staff,
            }
        }, status=status.HTTP_200_OK)
