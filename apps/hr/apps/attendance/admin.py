from django.contrib import admin
from .models import Shift, AttendanceLog, AttendanceRecord, AttendanceRegularization, MonthlyAttendanceSummary


@admin.register(Shift)
class ShiftAdmin(admin.ModelAdmin):
    list_display = ("name", "tenant", "start_time", "end_time", "is_active")
    list_filter = ("tenant", "is_active")


@admin.register(AttendanceRecord)
class AttendanceRecordAdmin(admin.ModelAdmin):
    list_display = ("employee", "attendance_date", "status", "net_working_minutes", "late_by_minutes")
    list_filter = ("status", "tenant", "attendance_date")
    search_fields = ("employee__first_name", "employee__last_name", "employee__employee_code")
    date_hierarchy = "attendance_date"


@admin.register(AttendanceRegularization)
class RegularizationAdmin(admin.ModelAdmin):
    list_display = ("employee", "attendance_date", "status", "requested_at")
    list_filter = ("status", "tenant")
