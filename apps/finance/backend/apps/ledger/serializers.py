from decimal import Decimal

from rest_framework import serializers

from apps.masters.models import Account, Company, FiscalYear

from .models import JournalEntry, JournalLine
from .posting import LedgerService, LineSpec


class JournalLineSerializer(serializers.ModelSerializer):
    account_code = serializers.CharField(source="account.code", read_only=True)
    account_name = serializers.CharField(source="account.name", read_only=True)

    class Meta:
        model = JournalLine
        fields = (
            "id", "account", "account_code", "account_name",
            "debit", "credit", "description",
            "cost_center", "project", "party_id",
        )


class JournalEntrySerializer(serializers.ModelSerializer):
    lines = JournalLineSerializer(many=True, read_only=True)

    class Meta:
        model = JournalEntry
        fields = (
            "id", "company", "fiscal_year", "voucher_no", "date",
            "narration", "status", "posted_at", "lines",
        )
        read_only_fields = ("status", "posted_at")


class ManualLineInputSerializer(serializers.Serializer):
    account = serializers.PrimaryKeyRelatedField(queryset=Account.objects.all())
    debit = serializers.DecimalField(max_digits=18, decimal_places=4, default=Decimal("0"))
    credit = serializers.DecimalField(max_digits=18, decimal_places=4, default=Decimal("0"))
    description = serializers.CharField(required=False, allow_blank=True, default="")


class ManualJournalEntryCreateSerializer(serializers.Serializer):
    """Input for POST /api/v1/ledger/manual/  — creates and posts in one shot."""

    company = serializers.PrimaryKeyRelatedField(queryset=Company.objects.all())
    fiscal_year = serializers.PrimaryKeyRelatedField(queryset=FiscalYear.objects.all())
    voucher_no = serializers.CharField(max_length=40)
    date = serializers.DateField()
    narration = serializers.CharField(required=False, allow_blank=True, default="")
    lines = ManualLineInputSerializer(many=True)

    def validate(self, data):
        lines = data["lines"]
        if len(lines) < 2:
            raise serializers.ValidationError("At least 2 lines required for double entry.")
        total_d = sum((ln["debit"] for ln in lines), Decimal("0"))
        total_c = sum((ln["credit"] for ln in lines), Decimal("0"))
        if total_d != total_c:
            raise serializers.ValidationError(
                f"Unbalanced: debits={total_d} credits={total_c}"
            )
        if total_d == 0:
            raise serializers.ValidationError("Total amount cannot be zero.")
        return data

    def create(self, validated_data):
        request = self.context.get("request")
        service = LedgerService()
        line_specs = [
            LineSpec(
                account=ln["account"],
                debit=ln["debit"],
                credit=ln["credit"],
                description=ln.get("description", ""),
            )
            for ln in validated_data["lines"]
        ]
        return service.post_manual(
            company=validated_data["company"],
            fiscal_year=validated_data["fiscal_year"],
            voucher_no=validated_data["voucher_no"],
            entry_date=validated_data["date"],
            narration=validated_data.get("narration", ""),
            lines=line_specs,
            user=getattr(request, "user", None),
        )


class TrialBalanceRowSerializer(serializers.Serializer):
    account_id = serializers.IntegerField()
    code = serializers.CharField()
    name = serializers.CharField()
    type = serializers.CharField()
    debit = serializers.DecimalField(max_digits=18, decimal_places=4)
    credit = serializers.DecimalField(max_digits=18, decimal_places=4)
    balance = serializers.DecimalField(max_digits=18, decimal_places=4)
