"""Super-admin coupon CRUD."""
from __future__ import annotations

from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .audit import record_audit
from .coupons import _normalize_code
from .models import CouponCode, CouponRedemption
from .permissions import IsSuperAdmin


def _serialize_coupon(c: CouponCode) -> dict:
    return {
        "id": c.id,
        "code": c.code,
        "description": c.description,
        "discount_type": c.discount_type,
        "discount_value": str(c.discount_value),
        "applies_to_plans": c.applies_to_plans or [],
        "applies_to_cycles": c.applies_to_cycles or [],
        "max_redemptions": c.max_redemptions,
        "redemptions_used": c.redemptions_used,
        "valid_from": c.valid_from.isoformat() if c.valid_from else None,
        "valid_until": c.valid_until.isoformat() if c.valid_until else None,
        "first_time_only": c.first_time_only,
        "is_active": c.is_active,
        "created_by": c.created_by,
        "created_at": c.created_at.isoformat() if c.created_at else None,
    }


class AdminCouponsView(APIView):
    """GET/POST /api/v1/saas/admin/coupons/"""

    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def get(self, request):
        qs = CouponCode.objects.all().order_by("-created_at")
        if request.query_params.get("active") == "1":
            qs = qs.filter(is_active=True)
        return Response([_serialize_coupon(c) for c in qs])

    def post(self, request):
        code = _normalize_code(request.data.get("code", ""))
        if not code:
            return Response({"detail": "code is required."}, status=status.HTTP_400_BAD_REQUEST)
        if CouponCode.objects.filter(code=code).exists():
            return Response({"detail": "Coupon code already exists."}, status=status.HTTP_400_BAD_REQUEST)

        coupon = CouponCode.objects.create(
            code=code,
            description=(request.data.get("description") or "").strip(),
            discount_type=request.data.get("discount_type", CouponCode.DiscountType.PERCENT),
            discount_value=request.data.get("discount_value", 0),
            applies_to_plans=request.data.get("applies_to_plans") or [],
            applies_to_cycles=request.data.get("applies_to_cycles") or [],
            max_redemptions=request.data.get("max_redemptions") or None,
            valid_from=request.data.get("valid_from") or None,
            valid_until=request.data.get("valid_until") or None,
            first_time_only=bool(request.data.get("first_time_only", False)),
            is_active=bool(request.data.get("is_active", True)),
            created_by=request.user.email,
        )
        record_audit(request, "coupon.create", target_label=code, detail=_serialize_coupon(coupon))
        return Response(_serialize_coupon(coupon), status=status.HTTP_201_CREATED)


class AdminCouponDetailView(APIView):
    """GET/PATCH/DELETE /api/v1/saas/admin/coupons/<id>/"""

    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def get(self, request, pk):
        coupon = CouponCode.objects.filter(pk=pk).first()
        if not coupon:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        redemptions = list(
            CouponRedemption.objects.filter(coupon=coupon)
            .select_related("tenant")
            .order_by("-created_at")[:50]
            .values(
                "id", "plan_code", "billing_cycle", "original_amount", "discount_amount",
                "final_amount", "redeemed_by_email", "created_at", "tenant__schema_name",
            )
        )
        return Response({"coupon": _serialize_coupon(coupon), "redemptions": redemptions})

    def patch(self, request, pk):
        coupon = CouponCode.objects.filter(pk=pk).first()
        if not coupon:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        for field in (
            "description", "discount_type", "discount_value", "applies_to_plans",
            "applies_to_cycles", "max_redemptions", "valid_from", "valid_until",
            "first_time_only", "is_active",
        ):
            if field in request.data:
                setattr(coupon, field, request.data[field])
        coupon.save()
        record_audit(request, "coupon.update", target_label=coupon.code, detail=_serialize_coupon(coupon))
        return Response(_serialize_coupon(coupon))

    def delete(self, request, pk):
        coupon = CouponCode.objects.filter(pk=pk).first()
        if not coupon:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        coupon.is_active = False
        coupon.save(update_fields=["is_active", "updated_at"])
        record_audit(request, "coupon.deactivate", target_label=coupon.code)
        return Response(status=status.HTTP_204_NO_CONTENT)
