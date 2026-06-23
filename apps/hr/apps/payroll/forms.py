import json
from django import forms
from decimal import Decimal
from .models import (StatutorySetting, SalaryStructure, SalaryStructureComponent,
                     SalaryComponent, EmployeeLoan, ExpenseClaim, TaxDeclaration, PayslipTemplate)

INPUT = "input input-bordered w-full"
SELECT = "select select-bordered w-full"
TEXTAREA = "textarea textarea-bordered w-full"


class EmployeeLoanForm(forms.ModelForm):
    employee = forms.ModelChoiceField(queryset=None, widget=forms.Select(attrs={"class": SELECT}))

    class Meta:
        model = EmployeeLoan
        fields = ["employee", "loan_type", "principal_amount", "emi_amount",
                  "total_installments", "interest_rate", "disbursed_date", "status"]
        widgets = {
            "loan_type": forms.TextInput(attrs={"class": INPUT, "placeholder": "Personal / Salary advance / Medical"}),
            "principal_amount": forms.NumberInput(attrs={"class": INPUT, "step": "0.01"}),
            "emi_amount": forms.NumberInput(attrs={"class": INPUT, "step": "0.01"}),
            "total_installments": forms.NumberInput(attrs={"class": INPUT, "placeholder": "Months"}),
            "interest_rate": forms.NumberInput(attrs={"class": INPUT, "step": "0.01", "placeholder": "0 for interest-free"}),
            "disbursed_date": forms.DateInput(attrs={"class": INPUT, "type": "date"}),
            "status": forms.Select(attrs={"class": SELECT}),
        }

    def __init__(self, tenant, *args, **kwargs):
        super().__init__(*args, **kwargs)
        from apps.employees.models import Employee
        self.tenant = tenant
        self.fields["employee"].queryset = Employee.objects.filter(
            tenant=tenant, employment_status="active"
        ).order_by("first_name", "last_name")
        # Lock employee on edit
        if self.instance and self.instance.pk:
            self.fields["employee"].disabled = True

    def save(self, commit=True):
        obj = super().save(commit=False)
        obj.tenant = self.tenant
        if not obj.pk:
            obj.outstanding_amount = obj.principal_amount
        if commit:
            obj.save()
        return obj


class ExpenseClaimForm(forms.ModelForm):
    EXPENSE_CATEGORIES = [
        ("", "Select category"),
        ("travel", "Travel & conveyance"),
        ("meals", "Meals & entertainment"),
        ("internet", "Internet & telecom"),
        ("software", "Software & subscriptions"),
        ("office", "Office supplies"),
        ("training", "Training & certification"),
        ("medical", "Medical reimbursement"),
        ("other", "Other"),
    ]

    category = forms.ChoiceField(choices=EXPENSE_CATEGORIES, widget=forms.Select(attrs={"class": SELECT}))

    class Meta:
        model = ExpenseClaim
        fields = ["category", "amount", "description", "expense_date", "receipt"]
        widgets = {
            "amount": forms.NumberInput(attrs={"class": INPUT, "step": "0.01"}),
            "description": forms.Textarea(attrs={"class": TEXTAREA, "rows": 3, "placeholder": "What was the expense for?"}),
            "expense_date": forms.DateInput(attrs={"class": INPUT, "type": "date"}),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        cat = getattr(self.instance, "category", "")
        if cat and cat not in dict(self.EXPENSE_CATEGORIES):
            self.fields["category"].choices = list(self.EXPENSE_CATEGORIES) + [(cat, cat)]


class StatutorySettingForm(forms.ModelForm):
    slabs_text = forms.CharField(
        required=False,
        label="PT Slabs (JSON, only for Professional Tax)",
        widget=forms.Textarea(attrs={"class": TEXTAREA, "rows": 5,
            "placeholder": '[{"min":0,"max":14999,"amount":0},{"min":15000,"max":null,"amount":200}]'}),
        help_text="Leave blank for PF/ESI/LWF. Use rate fields instead.",
    )

    class Meta:
        model = StatutorySetting
        fields = ["statutory_type", "state_code", "employee_rate", "employer_rate",
                  "wage_ceiling", "effective_date", "is_active"]
        widgets = {
            "statutory_type": forms.Select(attrs={"class": SELECT}),
            "state_code": forms.TextInput(attrs={"class": INPUT, "placeholder": "IN-KA, IN-MH (blank for PF/ESI)"}),
            "employee_rate": forms.NumberInput(attrs={"class": INPUT, "step": "0.0001", "placeholder": "0.12 = 12%"}),
            "employer_rate": forms.NumberInput(attrs={"class": INPUT, "step": "0.0001"}),
            "wage_ceiling": forms.NumberInput(attrs={"class": INPUT, "step": "0.01"}),
            "effective_date": forms.DateInput(attrs={"class": INPUT, "type": "date"}),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.instance and self.instance.pk and self.instance.slabs:
            self.fields["slabs_text"].initial = json.dumps(self.instance.slabs, indent=2)

    def clean_slabs_text(self):
        v = self.cleaned_data.get("slabs_text", "").strip()
        if not v:
            return []
        try:
            data = json.loads(v)
            if not isinstance(data, list):
                raise ValueError("Slabs must be a JSON array.")
            return data
        except json.JSONDecodeError as exc:
            raise forms.ValidationError(f"Invalid JSON: {exc}")

    def save(self, commit=True):
        obj = super().save(commit=False)
        obj.slabs = self.cleaned_data.get("slabs_text") or []
        if commit:
            obj.save()
        return obj


class TaxDeclarationForm(forms.ModelForm):
    class Meta:
        model = TaxDeclaration
        fields = [
            "regime",
            "rent_paid_annual", "is_metro_city", "landlord_name", "landlord_pan",
            "sec_80c_ppf", "sec_80c_elss", "sec_80c_lic",
            "sec_80c_home_loan_principal", "sec_80c_tuition_fees", "sec_80c_other",
            "sec_80d_self", "sec_80d_parents", "sec_80d_parents_senior",
            "sec_80ccd_1b_nps", "sec_80e_education_loan", "sec_80g_donations",
            "sec_24_home_loan_interest", "other_income_annual",
        ]
        widgets = {
            "regime": forms.Select(attrs={"class": SELECT}),
            "rent_paid_annual": forms.NumberInput(attrs={"class": INPUT, "step": "0.01", "placeholder": "Annual rent in INR"}),
            "landlord_name": forms.TextInput(attrs={"class": INPUT}),
            "landlord_pan": forms.TextInput(attrs={"class": INPUT, "placeholder": "Required if annual rent > 1,00,000"}),
            "sec_80c_ppf": forms.NumberInput(attrs={"class": INPUT, "step": "0.01"}),
            "sec_80c_elss": forms.NumberInput(attrs={"class": INPUT, "step": "0.01"}),
            "sec_80c_lic": forms.NumberInput(attrs={"class": INPUT, "step": "0.01"}),
            "sec_80c_home_loan_principal": forms.NumberInput(attrs={"class": INPUT, "step": "0.01"}),
            "sec_80c_tuition_fees": forms.NumberInput(attrs={"class": INPUT, "step": "0.01"}),
            "sec_80c_other": forms.NumberInput(attrs={"class": INPUT, "step": "0.01"}),
            "sec_80d_self": forms.NumberInput(attrs={"class": INPUT, "step": "0.01"}),
            "sec_80d_parents": forms.NumberInput(attrs={"class": INPUT, "step": "0.01"}),
            "sec_80ccd_1b_nps": forms.NumberInput(attrs={"class": INPUT, "step": "0.01"}),
            "sec_80e_education_loan": forms.NumberInput(attrs={"class": INPUT, "step": "0.01"}),
            "sec_80g_donations": forms.NumberInput(attrs={"class": INPUT, "step": "0.01"}),
            "sec_24_home_loan_interest": forms.NumberInput(attrs={"class": INPUT, "step": "0.01"}),
            "other_income_annual": forms.NumberInput(attrs={"class": INPUT, "step": "0.01"}),
        }

    def clean(self):
        cleaned = super().clean()
        if cleaned.get("regime") == "old":
            rent = cleaned.get("rent_paid_annual") or Decimal("0")
            if rent > Decimal("100000") and not cleaned.get("landlord_pan"):
                self.add_error("landlord_pan",
                               "Landlord PAN is required when annual rent exceeds Rs 1,00,000.")
        return cleaned


class SalaryStructureForm(forms.ModelForm):
    components = forms.ModelMultipleChoiceField(
        queryset=SalaryComponent.objects.none(),
        widget=forms.CheckboxSelectMultiple,
        required=False,
    )

    class Meta:
        model = SalaryStructure
        fields = ["name", "description", "is_active"]
        widgets = {
            "name": forms.TextInput(attrs={"class": INPUT, "placeholder": "Standard Indian Structure"}),
            "description": forms.Textarea(attrs={"class": TEXTAREA, "rows": 2}),
        }

    def __init__(self, tenant, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.tenant = tenant
        self.fields["components"].queryset = SalaryComponent.objects.filter(tenant=tenant, is_active=True).order_by("sequence_order")
        if self.instance and self.instance.pk:
            self.fields["components"].initial = self.instance.components.all()

    def save(self, commit=True):
        obj = super().save(commit=False)
        obj.tenant = self.tenant
        if commit:
            obj.save()
            chosen = self.cleaned_data["components"]
            current = set(obj.components.all())
            new_set = set(chosen)
            for c in current - new_set:
                SalaryStructureComponent.objects.filter(structure=obj, component=c).delete()
            for c in new_set - current:
                SalaryStructureComponent.objects.get_or_create(
                    structure=obj, component=c,
                    defaults={"sequence_order": c.sequence_order},
                )
        return obj


class PayslipTemplateForm(forms.ModelForm):
    html_file = forms.FileField(
        required=False,
        widget=forms.FileInput(attrs={"class": "file-input file-input-bordered w-full", "accept": ".html,.htm,text/html"}),
        help_text="Upload an HTML file to load into the editor (Custom layout only).",
    )

    class Meta:
        model = PayslipTemplate
        fields = [
            "name", "layout", "template_html",
            "company_display_name", "company_address_override", "payslip_title", "template_logo",
            "footer_mode", "footer_text", "signatory_name_override", "signatory_title_override",
            "is_default", "is_active",
        ]
        widgets = {
            "name": forms.TextInput(attrs={"class": INPUT, "placeholder": "India Corporate Payslip"}),
            "layout": forms.Select(attrs={"class": SELECT, "id": "id_layout"}),
            "template_html": forms.Textarea(attrs={
                "class": TEXTAREA, "rows": 20, "spellcheck": "false", "id": "id_template_html",
                "style": "font-family: 'JetBrains Mono', monospace; font-size: 12px;",
            }),
            "company_display_name": forms.TextInput(attrs={
                "class": INPUT, "placeholder": "Leave blank to use letterhead company name",
            }),
            "company_address_override": forms.Textarea(attrs={
                "class": TEXTAREA, "rows": 2, "placeholder": "Registered office address on payslip",
            }),
            "payslip_title": forms.TextInput(attrs={
                "class": INPUT,
                "placeholder": "Payslip for the month of {month_year}",
            }),
            "template_logo": forms.FileInput(attrs={"class": "file-input file-input-bordered w-full", "accept": "image/*"}),
            "footer_mode": forms.Select(attrs={"class": SELECT, "id": "id_footer_mode"}),
            "footer_text": forms.Textarea(attrs={
                "class": TEXTAREA, "rows": 2, "id": "id_footer_text",
                "placeholder": "System-generated disclaimer or certification note",
            }),
            "signatory_name_override": forms.TextInput(attrs={
                "class": INPUT, "placeholder": "From letterhead if blank",
            }),
            "signatory_title_override": forms.TextInput(attrs={
                "class": INPUT, "placeholder": "e.g. HR Manager / Director",
            }),
            "is_default": forms.CheckboxInput(attrs={"class": "checkbox checkbox-sm"}),
            "is_active": forms.CheckboxInput(attrs={"class": "checkbox checkbox-sm"}),
        }

    def clean(self):
        cleaned = super().clean()
        layout = cleaned.get("layout")
        html_file = self.files.get("html_file")
        if layout == "custom":
            if html_file:
                try:
                    cleaned["template_html"] = html_file.read().decode("utf-8")
                except UnicodeDecodeError:
                    self.add_error("html_file", "HTML file must be UTF-8 encoded.")
            if not (cleaned.get("template_html") or "").strip():
                self.add_error("template_html", "Custom layout requires HTML — paste or upload a file.")
        footer_mode = cleaned.get("footer_mode")
        if footer_mode == "custom" and not (cleaned.get("footer_text") or "").strip():
            self.add_error("footer_text", "Enter custom footer text.")
        return cleaned
