from django import forms
from .models import Shift

INPUT = "input input-bordered w-full"


class ShiftForm(forms.ModelForm):
    class Meta:
        model = Shift
        fields = [
            "name", "start_time", "end_time", "grace_in_minutes", "grace_out_minutes",
            "break_duration_minutes", "half_day_threshold_minutes",
            "full_day_threshold_minutes", "overtime_after_minutes",
            "weekly_off_days", "is_night_shift", "overtime_applicable", "is_active",
        ]
        widgets = {
            "name": forms.TextInput(attrs={"class": INPUT, "placeholder": "General Shift"}),
            "start_time": forms.TimeInput(attrs={"class": INPUT, "type": "time"}),
            "end_time": forms.TimeInput(attrs={"class": INPUT, "type": "time"}),
            "grace_in_minutes": forms.NumberInput(attrs={"class": INPUT}),
            "grace_out_minutes": forms.NumberInput(attrs={"class": INPUT}),
            "break_duration_minutes": forms.NumberInput(attrs={"class": INPUT}),
            "half_day_threshold_minutes": forms.NumberInput(attrs={"class": INPUT}),
            "full_day_threshold_minutes": forms.NumberInput(attrs={"class": INPUT}),
            "overtime_after_minutes": forms.NumberInput(attrs={"class": INPUT}),
            "weekly_off_days": forms.TextInput(attrs={"class": INPUT, "placeholder": "saturday,sunday"}),
        }
