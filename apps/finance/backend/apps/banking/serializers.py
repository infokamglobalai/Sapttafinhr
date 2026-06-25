import re

from rest_framework import serializers

from .ifsc import validate_ifsc_format
from .models import Advance, BankAccount, BankStatement, BankStatementLine, FXRate, PostDatedCheque

ACCOUNT_RE = re.compile(r"^[0-9]{9,18}$")


class BankAccountSerializer(serializers.ModelSerializer):
    ledger_account_code = serializers.CharField(source="ledger_account.code", read_only=True)

    class Meta:
        model = BankAccount
        fields = "__all__"

    def validate_ifsc(self, value: str) -> str:
        if not (value or "").strip():
            return ""
        err = validate_ifsc_format(value, required=True)
        if err:
            raise serializers.ValidationError(err)
        return value.strip().upper()

    def validate_account_number(self, value: str) -> str:
        raw = (value or "").strip()
        if not raw:
            raise serializers.ValidationError("Account number is required.")
        digits = re.sub(r"\D", "", raw)
        if not ACCOUNT_RE.match(digits):
            raise serializers.ValidationError("Account number must be 9–18 digits.")
        return digits


class BankStatementLineSer(serializers.ModelSerializer):
    class Meta:
        model = BankStatementLine
        fields = "__all__"


class BankStatementSer(serializers.ModelSerializer):
    lines = BankStatementLineSer(many=True, read_only=True)

    class Meta:
        model = BankStatement
        fields = "__all__"


class PDCSerializer(serializers.ModelSerializer):
    party_name = serializers.CharField(source="party.name", read_only=True)
    class Meta:
        model = PostDatedCheque
        fields = "__all__"


class AdvanceSerializer(serializers.ModelSerializer):
    party_name = serializers.CharField(source="party.name", read_only=True)
    class Meta:
        model = Advance
        fields = "__all__"


class FXRateSerializer(serializers.ModelSerializer):
    class Meta:
        model = FXRate
        fields = "__all__"
