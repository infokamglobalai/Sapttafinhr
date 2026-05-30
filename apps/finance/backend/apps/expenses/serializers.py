from rest_framework import serializers

from .models import Budget, ExpenseClaim, ExpenseClaimLine, PettyCashFloat, PettyCashTransaction


class ExpenseClaimLineSer(serializers.ModelSerializer):
    class Meta:
        model = ExpenseClaimLine
        fields = ("id", "date", "expense_account", "cost_center", "project",
                  "description", "amount")


class ExpenseClaimSer(serializers.ModelSerializer):
    employee_email = serializers.CharField(source="employee.email", read_only=True)
    lines = ExpenseClaimLineSer(many=True)

    class Meta:
        model = ExpenseClaim
        fields = "__all__"
        read_only_fields = ("total", "status", "approved_by", "approved_at",
                            "journal_entry", "rejection_reason")

    def create(self, validated_data):
        lines = validated_data.pop("lines", [])
        claim = ExpenseClaim.objects.create(**validated_data)
        total = 0
        for ld in lines:
            ExpenseClaimLine.objects.create(claim=claim, **ld)
            total += ld["amount"]
        claim.total = total
        claim.save(update_fields=["total", "updated_at"])
        return claim


class PettyFloatSer(serializers.ModelSerializer):
    custodian_email = serializers.CharField(source="custodian.email", read_only=True)
    class Meta: model = PettyCashFloat; fields = "__all__"


class PettyTxnSer(serializers.ModelSerializer):
    class Meta: model = PettyCashTransaction; fields = "__all__"


class BudgetSer(serializers.ModelSerializer):
    account_code = serializers.CharField(source="account.code", read_only=True)
    class Meta: model = Budget; fields = "__all__"
