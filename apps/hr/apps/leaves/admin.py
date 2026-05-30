from django.contrib import admin
from .models import LeaveType, LeaveBalance, LeaveRequest, HolidayCalendar, Holiday


@admin.register(LeaveType)
class LeaveTypeAdmin(admin.ModelAdmin):
    list_display = ("name", "code", "tenant", "is_paid", "accrual_type", "is_active")
    list_filter = ("tenant", "is_paid", "accrual_type", "is_active")


@admin.register(LeaveRequest)
class LeaveRequestAdmin(admin.ModelAdmin):
    list_display = ("employee", "leave_type", "from_date", "to_date", "total_days", "status", "applied_at")
    list_filter = ("status", "tenant", "leave_type")
    search_fields = ("employee__first_name", "employee__last_name")
    date_hierarchy = "from_date"


@admin.register(LeaveBalance)
class LeaveBalanceAdmin(admin.ModelAdmin):
    list_display = ("employee", "leave_type", "year", "opening_balance", "credited", "taken", "closing_balance")
    list_filter = ("tenant", "year", "leave_type")


class HolidayInline(admin.TabularInline):
    model = Holiday
    extra = 1


@admin.register(HolidayCalendar)
class HolidayCalendarAdmin(admin.ModelAdmin):
    list_display = ("name", "tenant", "year", "is_default")
    inlines = [HolidayInline]
