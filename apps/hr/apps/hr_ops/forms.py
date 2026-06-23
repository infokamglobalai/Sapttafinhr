from django import forms
from django.forms import inlineformset_factory
from .models import LetterTemplate, Asset, Announcement, OnboardingTemplate, OnboardingTask, CelebrationPost, CelebrationWish

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
            "letter_type": forms.Select(attrs={"class": SELECT, "id": "id_letter_type"}),
            "name": forms.TextInput(attrs={"class": INPUT, "placeholder": "Offer Letter — Standard"}),
            "template_html": forms.Textarea(attrs={
                "class": TEXTAREA, "rows": 18, "spellcheck": "false", "id": "id_template_html",
                "style": "font-family: 'JetBrains Mono', monospace; font-size: 13px; line-height: 1.6;",
            }),
        }


class CompanyLetterSettingsForm(forms.Form):
    display_name = forms.CharField(
        label="Company name on letters",
        max_length=255,
        required=False,
        widget=forms.TextInput(attrs={"class": INPUT, "placeholder": "Saptta Technologies Pvt Ltd"}),
    )
    address = forms.CharField(
        label="Registered address",
        required=False,
        widget=forms.Textarea(attrs={"class": TEXTAREA, "rows": 3, "placeholder": "Building, street, area…"}),
    )
    city = forms.CharField(
        required=False,
        widget=forms.TextInput(attrs={"class": INPUT, "placeholder": "Bengaluru, Karnataka"}),
    )
    signatory_name = forms.CharField(
        label="Signatory name (Director / HR head)",
        max_length=255,
        required=False,
        widget=forms.TextInput(attrs={"class": INPUT, "placeholder": "Priya Sharma"}),
    )
    signatory_title = forms.CharField(
        label="Signatory designation",
        max_length=255,
        required=False,
        widget=forms.TextInput(attrs={"class": INPUT, "placeholder": "Director — Human Resources"}),
    )
    contact_email = forms.EmailField(
        required=False,
        widget=forms.EmailInput(attrs={"class": INPUT, "placeholder": "hr@company.com"}),
    )
    contact_phone = forms.CharField(
        required=False,
        widget=forms.TextInput(attrs={"class": INPUT, "placeholder": "+91 98765 43210"}),
    )
    ref_prefix = forms.CharField(
        label="Reference prefix",
        max_length=20,
        required=False,
        widget=forms.TextInput(attrs={"class": INPUT, "placeholder": "HR"}),
        help_text="Used in letter refs e.g. HR/OFF/EMP001",
    )


class AssetForm(forms.ModelForm):
    class Meta:
        model = Asset
        fields = ["asset_code", "name", "category", "make", "model", "serial_number",
                  "purchase_date", "purchase_value", "status", "notes"]
        widgets = {
            "asset_code": forms.TextInput(attrs={
                "class": INPUT,
                "placeholder": "Auto-generated e.g. LP-APL-001",
                "readonly": "readonly",
            }),
            "name": forms.TextInput(attrs={"class": INPUT, "placeholder": "MacBook Pro 14\""}),
            "category": forms.TextInput(attrs={
                "class": INPUT,
                "placeholder": "laptop / phone / access_card",
                "id": "asset-category",
            }),
            "make": forms.TextInput(attrs={
                "class": INPUT,
                "placeholder": "Apple",
                "id": "asset-make",
            }),
            "model": forms.TextInput(attrs={"class": INPUT, "placeholder": "M2 Pro 14\""}),
            "serial_number": forms.TextInput(attrs={"class": INPUT}),
            "purchase_date": forms.DateInput(attrs={"class": INPUT, "type": "date"}),
            "purchase_value": forms.NumberInput(attrs={"class": INPUT, "step": "0.01"}),
            "status": forms.Select(attrs={"class": SELECT}),
            "notes": forms.Textarea(attrs={"class": TEXTAREA, "rows": 3}),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if not self.instance.pk:
            self.fields["asset_code"].required = False
            self.fields["asset_code"].help_text = "Generated on save from category + brand"
        else:
            self.fields["asset_code"].widget.attrs.pop("readonly", None)


class AnnouncementForm(forms.ModelForm):
    class Meta:
        model = Announcement
        fields = ["title", "content", "expires_at", "is_published"]
        widgets = {
            "title": forms.TextInput(attrs={"class": INPUT, "placeholder": "Office closed on..."}),
            "content": forms.Textarea(attrs={"class": TEXTAREA, "rows": 6}),
            "expires_at": forms.DateTimeInput(attrs={"class": INPUT, "type": "datetime-local"}),
        }


class ServiceRequestForm(forms.Form):
    category = forms.ChoiceField(
        choices=[
            ("it_issue", "IT / Laptop issue"),
            ("hardware", "Hardware request (needs manager approval)"),
            ("software", "Software / Subscription / API key (needs manager approval)"),
            ("hr_other", "HR / Other"),
        ],
        widget=forms.Select(attrs={"class": SELECT, "id": "sr-category"}),
    )
    subject = forms.CharField(max_length=255, widget=forms.TextInput(attrs={"class": INPUT, "placeholder": "Brief summary"}))
    description = forms.CharField(widget=forms.Textarea(attrs={"class": TEXTAREA, "rows": 5, "placeholder": "Describe the issue or what you need..."}))
    priority = forms.ChoiceField(
        choices=[("low", "Low"), ("normal", "Normal"), ("urgent", "Urgent")],
        initial="normal",
        widget=forms.Select(attrs={"class": SELECT}),
    )
    asset = forms.ModelChoiceField(
        queryset=Asset.objects.none(),
        required=False,
        empty_label="— Not linked to an asset —",
        widget=forms.Select(attrs={"class": SELECT}),
    )
    attachment = forms.FileField(required=False, widget=forms.ClearableFileInput(attrs={"class": "file-input file-input-bordered w-full"}))

    def __init__(self, *args, assigned_assets=None, **kwargs):
        super().__init__(*args, **kwargs)
        if assigned_assets is not None:
            self.fields["asset"].queryset = assigned_assets


class CelebrationPostForm(forms.ModelForm):
    class Meta:
        model = CelebrationPost
        fields = [
            "celebration_type", "subject_employee", "title", "message", "poster_image",
        ]
        widgets = {
            "celebration_type": forms.Select(attrs={"class": SELECT, "id": "id_celebration_type"}),
            "subject_employee": forms.Select(attrs={"class": SELECT, "id": "id_subject_employee"}),
            "title": forms.TextInput(attrs={"class": INPUT, "placeholder": "Auto-filled from type & employee"}),
            "message": forms.Textarea(attrs={"class": TEXTAREA, "rows": 5, "id": "id_message"}),
            "poster_image": forms.FileInput(attrs={"class": "file-input file-input-bordered w-full", "accept": "image/*"}),
        }

    def __init__(self, tenant, *args, **kwargs):
        super().__init__(*args, **kwargs)
        from apps.employees.models import Employee
        self.fields["subject_employee"].queryset = Employee.objects.filter(
            tenant=tenant, is_active=True
        ).order_by("first_name", "last_name")
        self.fields["subject_employee"].required = False


class CelebrationWishForm(forms.ModelForm):
    class Meta:
        model = CelebrationWish
        fields = ["message", "emoji"]
        widgets = {
            "message": forms.TextInput(attrs={
                "class": INPUT, "placeholder": "Write your wish…", "maxlength": "500",
            }),
            "emoji": forms.HiddenInput(attrs={"id": "id_wish_emoji"}),
        }
