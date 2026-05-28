from django.contrib import admin

from .models import Budget, ExpenseClaim, ExpenseClaimLine, PettyCashFloat, PettyCashTransaction


class ECLLineInline(admin.TabularInline):
    model = ExpenseClaimLine
    extra = 0


@admin.register(ExpenseClaim)
class ECLAdmin(admin.ModelAdmin):
    list_display = ("claim_no", "date", "employee", "total", "status")
    list_filter = ("status", "company")
    inlines = [ECLLineInline]


class PCTInline(admin.TabularInline):
    model = PettyCashTransaction
    extra = 0


@admin.register(PettyCashFloat)
class PCFAdmin(admin.ModelAdmin):
    list_display = ("name", "custodian", "float_limit", "current_balance", "is_active")
    inlines = [PCTInline]


@admin.register(Budget)
class BudgetAdmin(admin.ModelAdmin):
    list_display = ("account", "period", "period_start", "period_end", "amount", "cost_center")
    list_filter = ("period", "company")
