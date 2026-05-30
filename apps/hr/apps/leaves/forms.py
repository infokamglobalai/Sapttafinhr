from django import forms
from .models import LeaveType

INPUT = "input input-bordered w-full"
SELECT = "select select-bordered w-full"
TEXTAREA = "textarea textarea-bordered w-full"


class LeaveTypeForm(forms.ModelForm):
    class Meta:
        model = LeaveType
        fields = [
            "name", "code", "is_paid", "accrual_type", "accrual_value",
            "max_annual_balance", "max_carry_forward",
            "min_notice_days", "max_consecutive_days", "requires_document_after",
            "applicable_gender", "applicable_after_months",
            "allow_half_day", "include_holidays", "include_weekends", "is_active",
        ]
        widgets = {
            "name": forms.TextInput(attrs={"class": INPUT, "placeholder": "Casual Leave"}),
            "code": forms.TextInput(attrs={"class": INPUT, "placeholder": "CL", "maxlength": 10}),
            "accrual_type": forms.Select(attrs={"class": SELECT}),
            "accrual_value": forms.NumberInput(attrs={"class": INPUT, "step": "0.5"}),
            "max_annual_balance": forms.NumberInput(attrs={"class": INPUT, "step": "0.5"}),
            "max_carry_forward": forms.NumberInput(attrs={"class": INPUT, "step": "0.5"}),
            "min_notice_days": forms.NumberInput(attrs={"class": INPUT}),
            "max_consecutive_days": forms.NumberInput(attrs={"class": INPUT}),
            "requires_document_after": forms.NumberInput(attrs={"class": INPUT}),
            "applicable_gender": forms.Select(attrs={"class": SELECT}),
            "applicable_after_months": forms.NumberInput(attrs={"class": INPUT}),
        }
