from django.contrib import admin
from .models import (
    SalaryComponent, SalaryStructure, EmployeeSalary,
    StatutorySetting, PayrollRun, PayrollRecord, Payslip,
    EmployeeLoan, ExpenseClaim,
)


@admin.register(SalaryComponent)
class SalaryComponentAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "tenant", "component_type", "calc_type", "is_active")
    list_filter = ("tenant", "component_type", "calc_type", "is_active")


@admin.register(SalaryStructure)
class SalaryStructureAdmin(admin.ModelAdmin):
    list_display = ("name", "tenant", "is_active")


@admin.register(EmployeeSalary)
class EmployeeSalaryAdmin(admin.ModelAdmin):
    list_display = ("employee", "ctc_annual", "basic_monthly", "effective_date", "is_active")
    list_filter = ("tenant", "is_active")


@admin.register(StatutorySetting)
class StatutorySettingAdmin(admin.ModelAdmin):
    list_display = ("tenant", "statutory_type", "state_code", "employee_rate", "employer_rate", "wage_ceiling", "is_active")
    list_filter = ("tenant", "statutory_type", "is_active")


@admin.register(PayrollRun)
class PayrollRunAdmin(admin.ModelAdmin):
    list_display = ("tenant", "year", "month", "status", "total_employees", "total_net", "run_at")
    list_filter = ("tenant", "status", "year")
    readonly_fields = ("run_at", "approved_at", "paid_at")


@admin.register(PayrollRecord)
class PayrollRecordAdmin(admin.ModelAdmin):
    list_display = ("employee", "payroll_run", "gross_earnings", "total_deductions", "net_payable", "is_locked")
    list_filter = ("tenant", "is_locked")
    search_fields = ("employee__first_name", "employee__last_name", "employee__employee_code")
