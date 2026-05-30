from django import forms
from django.forms import inlineformset_factory
from .models import LetterTemplate, Asset, Announcement, OnboardingTemplate, OnboardingTask

INPUT = "input input-bordered w-full"
SELECT = "select select-bordered w-full"
TEXTAREA = "textarea textarea-bordered w-full"


class OnboardingTemplateForm(forms.ModelForm):
    class Meta:
        model = OnboardingTemplate
        fields = ["name", "is_default"]
        widgets = {
            "name": forms.TextInput(attrs={"class": INPUT, "placeholder": "Standard New Hire Onboarding"}),
        }


class OnboardingTaskForm(forms.ModelForm):
    class Meta:
        model = OnboardingTask
        fields = ["task_name", "description", "responsible_party",
                  "due_days_offset", "is_required", "sequence_order"]
        widgets = {
            "task_name": forms.TextInput(attrs={"class": INPUT, "placeholder": "e.g. Collect signed offer letter"}),
            "description": forms.TextInput(attrs={"class": INPUT, "placeholder": "Optional detail"}),
            "responsible_party": forms.Select(attrs={"class": SELECT}),
            "due_days_offset": forms.NumberInput(attrs={"class": INPUT, "style": "max-width: 90px;"}),
            "sequence_order": forms.NumberInput(attrs={"class": INPUT, "style": "max-width: 80px;"}),
        }


OnboardingTaskFormSet = inlineformset_factory(
    OnboardingTemplate, OnboardingTask, form=OnboardingTaskForm,
    extra=3, can_delete=True, min_num=0,
)


class LetterTemplateForm(forms.ModelForm):
    class Meta:
        model = LetterTemplate
        fields = ["letter_type", "name", "template_html", "is_active"]
        widgets = {
            "letter_type": forms.Select(attrs={"class": SELECT}),
            "name": forms.TextInput(attrs={"class": INPUT, "placeholder": "Experience Letter — Standard"}),
            "template_html": forms.Textarea(attrs={
                "class": TEXTAREA, "rows": 16, "spellcheck": "false",
                "style": "font-family: 'JetBrains Mono', monospace; font-size: 13px; line-height: 1.6;",
                "placeholder": '<p>To Whom It May Concern,</p>\n<p>This is to certify that {{ employee.full_name }} has been working with {{ tenant.name }} as {{ employee.designation.name }} since {{ employee.date_of_joining }}.</p>',
            }),
        }


class AssetForm(forms.ModelForm):
    class Meta:
        model = Asset
        fields = ["asset_code", "name", "category", "make", "model", "serial_number",
                  "purchase_date", "purchase_value", "status", "notes"]
        widgets = {
            "asset_code": forms.TextInput(attrs={"class": INPUT, "placeholder": "LP-001"}),
            "name": forms.TextInput(attrs={"class": INPUT, "placeholder": "MacBook Pro 14\""}),
            "category": forms.TextInput(attrs={"class": INPUT, "placeholder": "laptop / phone / access_card"}),
            "make": forms.TextInput(attrs={"class": INPUT, "placeholder": "Apple"}),
            "model": forms.TextInput(attrs={"class": INPUT, "placeholder": "M2 Pro 14\""}),
            "serial_number": forms.TextInput(attrs={"class": INPUT}),
            "purchase_date": forms.DateInput(attrs={"class": INPUT, "type": "date"}),
            "purchase_value": forms.NumberInput(attrs={"class": INPUT, "step": "0.01"}),
            "status": forms.Select(attrs={"class": SELECT}),
            "notes": forms.Textarea(attrs={"class": TEXTAREA, "rows": 3}),
        }


class AnnouncementForm(forms.ModelForm):
    class Meta:
        model = Announcement
        fields = ["title", "content", "expires_at", "is_published"]
        widgets = {
            "title": forms.TextInput(attrs={"class": INPUT, "placeholder": "Office closed on..."}),
            "content": forms.Textarea(attrs={"class": TEXTAREA, "rows": 6}),
            "expires_at": forms.DateTimeInput(attrs={"class": INPUT, "type": "datetime-local"}),
        }
