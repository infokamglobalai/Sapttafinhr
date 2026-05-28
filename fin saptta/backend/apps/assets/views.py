from datetime import date as _date

from rest_framework import viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.masters.models import FiscalYear

from .models import DepreciationEntry, FixedAsset
from .serializers import DepreciationSer, FixedAssetSer
from .services import run_monthly_depreciation


class FixedAssetViewSet(viewsets.ModelViewSet):
    queryset = FixedAsset.objects.select_related("asset_account", "accum_depr_account", "expense_account").all()
    serializer_class = FixedAssetSer
    filterset_fields = ("company", "is_disposed", "method", "category")
    search_fields = ("code", "name")


class DepreciationViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = DepreciationEntry.objects.select_related("asset").all()
    serializer_class = DepreciationSer
    filterset_fields = ("asset", "period_end")


class RunDepreciationView(APIView):
    """POST /api/v1/assets/run-depreciation/  body: { company, fiscal_year, period_end (YYYY-MM-DD) }"""
    def post(self, request):
        try:
            cid = int(request.data["company"])
            fy = FiscalYear.objects.get(pk=int(request.data["fiscal_year"]))
            period_end = _date.fromisoformat(request.data["period_end"])
        except (KeyError, ValueError) as e:
            raise ValidationError(str(e))
        count = run_monthly_depreciation(cid, period_end, fy, user=request.user)
        return Response({"depreciated_assets": count})
