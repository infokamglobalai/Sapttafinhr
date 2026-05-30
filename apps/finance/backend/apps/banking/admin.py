from django.contrib import admin

from .models import Advance, BankAccount, BankStatement, BankStatementLine, FXRate, PostDatedCheque


@admin.register(BankAccount)
class BankAccountAdmin(admin.ModelAdmin):
    list_display = ("name", "bank_name", "account_number", "currency", "is_active")


class StmtLineInline(admin.TabularInline):
    model = BankStatementLine
    extra = 0


@admin.register(BankStatement)
class BankStatementAdmin(admin.ModelAdmin):
    list_display = ("bank_account", "period_start", "period_end", "opening_balance", "closing_balance")
    inlines = [StmtLineInline]


@admin.register(PostDatedCheque)
class PDCAdmin(admin.ModelAdmin):
    list_display = ("cheque_no", "cheque_date", "direction", "party", "amount", "status")
    list_filter = ("status", "direction")


@admin.register(Advance)
class AdvanceAdmin(admin.ModelAdmin):
    list_display = ("date", "kind", "party", "amount", "balance")
    list_filter = ("kind",)


@admin.register(FXRate)
class FXRateAdmin(admin.ModelAdmin):
    list_display = ("date", "currency", "rate", "company")
    list_filter = ("currency",)
