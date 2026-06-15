from django import forms
from .models import Employee, Department, Designation, OfficeLocation, EmployeeDocument

CSS = "input input-bordered w-full"
SELECT_CSS = "select select-bordered w-full"
TEXTAREA_CSS = "textarea textarea-bordered w-full"


class EmployeeForm(forms.ModelForm):
    class Meta:
        model = Employee
        fields = [
            "first_name", "middle_name", "last_name",
            "date_of_birth", "gender", "blood_group",
            "personal_email", "official_email",
            "phone_primary", "phone_alternate",
            "department", "designation", "reporting_manager",
            "location", "work_state_code",
            "employment_type", "date_of_joining",
            "date_of_confirmation", "probation_end_date",
        ]
        widgets = {
            "first_name": forms.TextInput(attrs={"class": CSS}),
            "middle_name": forms.TextInput(attrs={"class": CSS}),
            "last_name": forms.TextInput(attrs={"class": CSS}),
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
        }

    def __init__(self, tenant, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["department"].queryset = Department.objects.filter(tenant=tenant, is_active=True)
        self.fields["designation"].queryset = Designation.objects.filter(tenant=tenant, is_active=True)
        self.fields["location"].queryset = OfficeLocation.objects.filter(tenant=tenant, is_active=True)
        self.fields["reporting_manager"].queryset = Employee.objects.filter(
            tenant=tenant, employment_status="active"
        ).exclude(pk=self.instance.pk if self.instance.pk else None)
        self.fields["reporting_manager"].required = False


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
