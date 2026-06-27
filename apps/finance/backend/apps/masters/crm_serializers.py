from rest_framework import serializers

from .models import LeadActivity, Party, SalesLead


class LeadActivitySerializer(serializers.ModelSerializer):
    activity_type_display = serializers.CharField(source="get_activity_type_display", read_only=True)
    created_by_email = serializers.CharField(source="created_by.email", read_only=True, default="")

    class Meta:
        model = LeadActivity
        fields = (
            "id", "lead", "activity_type", "activity_type_display",
            "summary", "activity_at", "created_by", "created_by_email",
            "created_at",
        )
        read_only_fields = ("created_by", "created_at")


class LeadActivityCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = LeadActivity
        fields = ("activity_type", "summary", "activity_at")

    def create(self, validated_data):
        lead = self.context["lead"]
        user = self.context["request"].user
        return LeadActivity.objects.create(
            lead=lead,
            created_by=user if user.is_authenticated else None,
            **validated_data,
        )


class SalesLeadSerializer(serializers.ModelSerializer):
    stage_display = serializers.CharField(source="get_stage_display", read_only=True)
    party_name = serializers.CharField(source="party.name", read_only=True, default="")
    display_name = serializers.CharField(read_only=True)
    activity_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = SalesLead
        fields = (
            "id", "company", "party", "party_name", "title", "contact_name", "organization",
            "email", "phone", "stage", "stage_display", "expected_value", "next_follow_up",
            "source", "notes", "lost_reason", "closed_at", "display_name", "activity_count",
            "created_at", "updated_at",
        )


class SalesLeadWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = SalesLead
        fields = (
            "company", "party", "title", "contact_name", "organization",
            "email", "phone", "stage", "expected_value", "next_follow_up",
            "source", "notes", "lost_reason",
        )

    def validate_party(self, party):
        company = self.initial_data.get("company") or getattr(self.instance, "company_id", None)
        if party and company and party.company_id != int(company):
            raise serializers.ValidationError("Party must belong to the same company.")
        if party and party.kind == Party.Kind.VENDOR:
            raise serializers.ValidationError("Link a customer party, not a vendor-only record.")
        return party
