from rest_framework import serializers

from .models import Advance, BankAccount, BankStatement, BankStatementLine, FXRate, PostDatedCheque


class BankAccountSerializer(serializers.ModelSerializer):
    ledger_account_code = serializers.CharField(source="ledger_account.code", read_only=True)

    class Meta:
        model = BankAccount
        fields = "__all__"


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
