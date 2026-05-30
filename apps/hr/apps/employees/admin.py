from django.contrib import admin
from .models import Employee, Department, Designation, OfficeLocation, EmployeeDocument


@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = ("employee_code", "full_name", "department", "designation", "employment_status", "date_of_joining")
    list_filter = ("employment_status", "employment_type", "department", "tenant")
    search_fields = ("first_name", "last_name", "employee_code", "official_email")
    readonly_fields = ("created_at", "updated_at", "employee_code")
    raw_id_fields = ("reporting_manager", "user")


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ("name", "tenant", "parent", "is_active")
    list_filter = ("tenant", "is_active")


@admin.register(Designation)
class DesignationAdmin(admin.ModelAdmin):
    list_display = ("name", "tenant", "level", "grade", "is_active")
    list_filter = ("tenant",)


@admin.register(OfficeLocation)
class OfficeLocationAdmin(admin.ModelAdmin):
    list_display = ("name", "tenant", "city", "state_code", "geo_fence_radius_m", "is_active")
    list_filter = ("tenant",)
