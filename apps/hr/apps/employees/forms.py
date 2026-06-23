from django import forms
from django.db import transaction
from .models import Employee, Department, Designation, OfficeLocation, EmployeeDocument, EmployeeBankAccount

CSS = "input input-bordered w-full"
SELECT_CSS = "select select-bordered w-full"
TEXTAREA_CSS = "textarea textarea-bordered w-full"

COMPLIANCE_FIELD_NAMES = (
    "pan_number", "aadhaar_number", "uan_number", "esi_number",
    "bank_account_holder", "bank_name", "bank_branch",
    "bank_account_number", "bank_ifsc",
)

GCC_COMPLIANCE_FIELD_NAMES = (
    "nationality", "is_kuwaiti_national", "civil_id", "residency_number",
    "residency_expiry", "passport_number", "passport_expiry",
    "work_permit_number", "work_permit_expiry", "civil_id_expiry",
    "sponsor_file_number", "contract_type", "contract_end_date", "pifss_number",
)


class EmployeeForm(forms.ModelForm):
    pan_number = forms.CharField(required=False, max_length=10, widget=forms.TextInput(attrs={"class": CSS, "placeholder": "ABCDE1234F"}))
    aadhaar_number = forms.CharField(required=False, max_length=12, widget=forms.TextInput(attrs={"class": CSS, "placeholder": "12-digit Aadhaar"}))
    uan_number = forms.CharField(required=False, max_length=12, widget=forms.TextInput(attrs={"class": CSS}))
    esi_number = forms.CharField(required=False, max_length=10, widget=forms.TextInput(attrs={"class": CSS}))
    bank_account_holder = forms.CharField(required=False, max_length=255, widget=forms.TextInput(attrs={"class": CSS}))
    bank_name = forms.CharField(required=False, max_length=255, widget=forms.TextInput(attrs={"class": CSS}))
    bank_branch = forms.CharField(required=False, max_length=255, widget=forms.TextInput(attrs={"class": CSS}))
    bank_account_number = forms.CharField(required=False, max_length=34, widget=forms.TextInput(attrs={"class": CSS}))
    bank_ifsc = forms.CharField(required=False, max_length=11, widget=forms.TextInput(attrs={"class": CSS}))
    # GCC / Kuwait (P1)
    civil_id = forms.CharField(required=False, max_length=12, widget=forms.TextInput(attrs={"class": CSS, "placeholder": "12-digit Civil ID"}))
    residency_number = forms.CharField(required=False, max_length=50, widget=forms.TextInput(attrs={"class": CSS}))
    residency_expiry = forms.DateField(required=False, widget=forms.DateInput(attrs={"class": CSS, "type": "date"}))
    passport_number = forms.CharField(required=False, max_length=50, widget=forms.TextInput(attrs={"class": CSS}))
    passport_expiry = forms.DateField(required=False, widget=forms.DateInput(attrs={"class": CSS, "type": "date"}))
    work_permit_number = forms.CharField(required=False, max_length=50, widget=forms.TextInput(attrs={"class": CSS}))
    work_permit_expiry = forms.DateField(required=False, widget=forms.DateInput(attrs={"class": CSS, "type": "date"}))
    civil_id_expiry = forms.DateField(required=False, widget=forms.DateInput(attrs={"class": CSS, "type": "date"}))
    sponsor_file_number = forms.CharField(required=False, max_length=50, widget=forms.TextInput(attrs={"class": CSS}))
    pifss_number = forms.CharField(required=False, max_length=50, widget=forms.TextInput(attrs={"class": CSS}))
    contract_end_date = forms.DateField(required=False, widget=forms.DateInput(attrs={"class": CSS, "type": "date"}))

    class Meta:
        model = Employee
        fields = [
            "first_name", "middle_name", "last_name", "preferred_name",
            "date_of_birth", "gender", "blood_group",
            "personal_email", "official_email",
            "phone_primary", "phone_alternate",
            "department", "designation", "reporting_manager",
            "location", "work_state_code",
            "employment_type", "date_of_joining",
            "date_of_confirmation", "probation_end_date",
            "nationality", "is_kuwaiti_national", "contract_type",
        ]
        widgets = {
            "first_name": forms.TextInput(attrs={"class": CSS}),
            "middle_name": forms.TextInput(attrs={"class": CSS}),
            "last_name": forms.TextInput(attrs={"class": CSS}),
            "preferred_name": forms.TextInput(attrs={"class": CSS, "placeholder": "Nickname for directory (optional)"}),
            "date_of_birth": forms.DateInput(attrs={"class": CSS, "type": "date"}),
            "gender": forms.Select(attrs={"class": SELECT_CSS}),
            "blood_group": forms.TextInput(attrs={"class": CSS}),
            "personal_email": forms.EmailInput(attrs={"class": CSS}),
            "official_email": forms.EmailInput(attrs={"class": CSS}),
            "phone_primary": forms.TextInput(attrs={"class": CSS}),
            "phone_alternate": forms.TextInput(attrs={"class": CSS}),
            "department": forms.Select(attrs={"class": SELECT_CSS}),
            "designation": forms.Select(attrs={"class": SELECT_CSS}),
            "reporting_manager": forms.Select(attrs={"class": SELECT_CSS}),
            "location": forms.Select(attrs={"class": SELECT_CSS}),
            "work_state_code": forms.TextInput(attrs={"class": CSS}),
            "employment_type": forms.Select(attrs={"class": SELECT_CSS}),
            "date_of_joining": forms.DateInput(attrs={"class": CSS, "type": "date"}),
            "date_of_confirmation": forms.DateInput(attrs={"class": CSS, "type": "date"}),
            "probation_end_date": forms.DateInput(attrs={"class": CSS, "type": "date"}),
            "nationality": forms.TextInput(attrs={"class": CSS, "placeholder": "e.g. KW, IN"}),
            "is_kuwaiti_national": forms.CheckboxInput(attrs={"class": "checkbox checkbox-sm"}),
            "contract_type": forms.Select(attrs={"class": SELECT_CSS}),
        }

    def __init__(self, tenant, *args, **kwargs):
        self.tenant = tenant
        super().__init__(*args, **kwargs)
        self.fields["department"].queryset = Department.objects.filter(tenant=tenant, is_active=True)
        self.fields["designation"].queryset = Designation.objects.filter(tenant=tenant, is_active=True)
        self.fields["location"].queryset = OfficeLocation.objects.filter(tenant=tenant, is_active=True)
        self.fields["reporting_manager"].queryset = Employee.objects.filter(
            tenant=tenant, employment_status="active"
        ).exclude(pk=self.instance.pk if self.instance.pk else None)
        self.fields["reporting_manager"].required = False

        if self.instance and self.instance.pk:
            self.fields["pan_number"].initial = self.instance.pan_number
            self.fields["aadhaar_number"].initial = self.instance.aadhaar_number
            self.fields["uan_number"].initial = self.instance.uan_number
            self.fields["esi_number"].initial = self.instance.esi_number
            self.fields["civil_id"].initial = self.instance.civil_id
            self.fields["residency_number"].initial = self.instance.residency_number
            self.fields["residency_expiry"].initial = self.instance.residency_expiry
            self.fields["passport_number"].initial = self.instance.passport_number
            self.fields["passport_expiry"].initial = self.instance.passport_expiry
            self.fields["work_permit_number"].initial = self.instance.work_permit_number
            self.fields["work_permit_expiry"].initial = self.instance.work_permit_expiry
            self.fields["civil_id_expiry"].initial = self.instance.civil_id_expiry
            self.fields["sponsor_file_number"].initial = self.instance.sponsor_file_number
            self.fields["pifss_number"].initial = self.instance.pifss_number
            self.fields["contract_end_date"].initial = self.instance.contract_end_date
            primary = self.instance.bank_accounts.filter(is_primary=True).first()
            if primary:
                self.fields["bank_account_holder"].initial = primary.account_holder_name
                self.fields["bank_name"].initial = primary.bank_name
                self.fields["bank_branch"].initial = primary.branch_name
                self.fields["bank_account_number"].initial = primary.account_number
                self.fields["bank_ifsc"].initial = primary.ifsc_code

    def cleaned_compliance_data(self) -> dict:
        """Compliance + bank fields stripped from Employee model create/update."""
        return {k: self.cleaned_data.get(k, "") for k in COMPLIANCE_FIELD_NAMES}

    @transaction.atomic
    def save_compliance(self, employee: Employee) -> None:
        data = self.cleaned_compliance_data()
        pan = (data.get("pan_number") or "").strip().upper()
        aadhaar = (data.get("aadhaar_number") or "").replace(" ", "")
        uan = (data.get("uan_number") or "").strip()
        esi = (data.get("esi_number") or "").strip()

        if pan:
            employee.pan_number = pan
        if aadhaar:
            employee.aadhaar_number = aadhaar
        employee.uan_number = uan
        employee.esi_number = esi
        employee.save(update_fields=["_pan_enc", "_aadhaar_enc", "uan_number", "esi_number"])

        self._save_gcc_compliance(employee)

        acct = (data.get("bank_account_number") or "").strip()
        ifsc = (data.get("bank_ifsc") or "").strip().upper()
        holder = (data.get("bank_account_holder") or "").strip()
        bank_name = (data.get("bank_name") or "").strip()
        if not (acct and ifsc and holder and bank_name):
            return

        branch = (data.get("bank_branch") or "").strip()
        primary = employee.bank_accounts.filter(is_primary=True).first()
        if primary:
            primary.account_holder_name = holder
            primary.bank_name = bank_name
            primary.branch_name = branch
            primary.account_number = acct
            primary.ifsc_code = ifsc[:11]
            primary.save()
        else:
            EmployeeBankAccount.objects.create(
                employee=employee,
                account_holder_name=holder,
                bank_name=bank_name,
                branch_name=branch,
                account_number=acct,
                ifsc_code=ifsc[:11],
                is_primary=True,
            )

    def _save_gcc_compliance(self, employee: Employee) -> None:
        from apps.tenants.jurisdiction import is_gcc_payroll

        if not is_gcc_payroll(getattr(self.tenant, "payroll_jurisdiction", "IN")):
            return

        cd = self.cleaned_data
        civil = (cd.get("civil_id") or "").strip()
        if civil:
            employee.civil_id = civil
        employee.residency_number = (cd.get("residency_number") or "").strip()
        employee.residency_expiry = cd.get("residency_expiry")
        employee.passport_number = (cd.get("passport_number") or "").strip()
        employee.passport_expiry = cd.get("passport_expiry")
        employee.work_permit_number = (cd.get("work_permit_number") or "").strip()
        employee.work_permit_expiry = cd.get("work_permit_expiry")
        employee.civil_id_expiry = cd.get("civil_id_expiry")
        employee.sponsor_file_number = (cd.get("sponsor_file_number") or "").strip()
        employee.pifss_number = (cd.get("pifss_number") or "").strip()
        employee.contract_end_date = cd.get("contract_end_date")
        employee.save(
            update_fields=[
                "_civil_id_enc", "residency_number", "residency_expiry",
                "passport_number", "passport_expiry", "work_permit_number",
                "work_permit_expiry", "civil_id_expiry", "sponsor_file_number",
                "pifss_number", "contract_end_date",
            ]
        )


class DepartmentForm(forms.ModelForm):
    class Meta:
        model = Department
        fields = ["name", "parent", "cost_center_code"]
        widgets = {
            "name": forms.TextInput(attrs={"class": CSS}),
            "parent": forms.Select(attrs={"class": SELECT_CSS}),
            "cost_center_code": forms.TextInput(attrs={"class": CSS}),
        }

    def __init__(self, tenant, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["parent"].queryset = Department.objects.filter(tenant=tenant, is_active=True)
        self.fields["parent"].required = False


class DesignationForm(forms.ModelForm):
    class Meta:
        model = Designation
        fields = ["name", "level", "grade"]
        widgets = {
            "name": forms.TextInput(attrs={"class": CSS}),
            "level": forms.NumberInput(attrs={"class": CSS}),
            "grade": forms.TextInput(attrs={"class": CSS}),
        }


class OfficeLocationForm(forms.ModelForm):
    class Meta:
        model = OfficeLocation
        fields = ["name", "address", "city", "state_code", "pincode", "latitude", "longitude", "geo_fence_radius_m"]
        widgets = {
            "name": forms.TextInput(attrs={"class": CSS}),
            "address": forms.Textarea(attrs={"class": TEXTAREA_CSS, "rows": 3}),
            "city": forms.TextInput(attrs={"class": CSS}),
            "state_code": forms.TextInput(attrs={"class": CSS}),
            "pincode": forms.TextInput(attrs={"class": CSS}),
            "latitude": forms.NumberInput(attrs={"class": CSS, "step": "0.0000001"}),
            "longitude": forms.NumberInput(attrs={"class": CSS, "step": "0.0000001"}),
            "geo_fence_radius_m": forms.NumberInput(attrs={"class": CSS}),
        }


class DocumentUploadForm(forms.ModelForm):
    class Meta:
        model = EmployeeDocument
        fields = ["document_type", "document_name", "file", "expiry_date"]
        widgets = {
            "document_type": forms.Select(attrs={"class": SELECT_CSS}),
            "document_name": forms.TextInput(attrs={"class": CSS}),
            "expiry_date": forms.DateInput(attrs={"class": CSS, "type": "date"}),
        }

    def clean_file(self):
        from utils.uploads import DOCUMENT_EXTS, validate_upload
        return validate_upload(self.cleaned_data.get("file"), allowed_exts=DOCUMENT_EXTS, max_mb=10)
