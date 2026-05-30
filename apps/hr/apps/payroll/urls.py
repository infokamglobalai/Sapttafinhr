from django.urls import path
from . import views

app_name = "payroll"

urlpatterns = [
    path("", views.payroll_run_list, name="run_list"),
    path("run/create/", views.payroll_run_create, name="run_create"),
    path("run/<int:pk>/", views.payroll_run_detail, name="run_detail"),
    path("run/<int:pk>/approve/", views.payroll_run_approve, name="run_approve"),
    path("run/<int:pk>/publish/", views.payroll_run_publish, name="run_publish"),
    path("run/<int:pk>/salary-register/", views.salary_register_excel, name="salary_register"),
    path("run/<int:pk>/bank-advice/", views.bank_advice_excel, name="bank_advice"),
    path("run/<int:pk>/pf-statement/", views.pf_statement_excel, name="pf_statement"),
    # ESS
    path("my-payslips/", views.my_payslips, name="my_payslips"),
    path("payslip/<int:pk>/", views.payslip_view, name="payslip"),
    # Config
    path("structures/", views.salary_structure_list, name="structures"),
    path("structures/new/", views.structure_create_or_edit, name="structure_create"),
    path("structures/<int:pk>/edit/", views.structure_create_or_edit, name="structure_edit"),
    path("statutory/", views.statutory_settings_view, name="statutory"),
    path("statutory/new/", views.statutory_create_or_edit, name="statutory_create"),
    path("statutory/<int:pk>/edit/", views.statutory_create_or_edit, name="statutory_edit"),
    # Loans
    path("loans/", views.loan_list, name="loans"),
    path("loans/new/", views.loan_create_or_edit, name="loan_create"),
    path("loans/<int:pk>/", views.loan_detail, name="loan_detail"),
    path("loans/<int:pk>/edit/", views.loan_create_or_edit, name="loan_edit"),
    path("my-loans/", views.my_loans, name="my_loans"),
    # Reimbursements / expense claims
    path("expenses/", views.expense_list, name="expenses"),
    path("expenses/new/", views.expense_submit, name="expense_submit"),
    path("expenses/<int:pk>/edit/", views.expense_submit, name="expense_edit"),
    path("expenses/<int:pk>/action/", views.expense_action, name="expense_action"),
    path("my-expenses/", views.my_expenses, name="my_expenses"),
    # Tax declarations
    path("my-tax-declaration/", views.my_tax_declaration, name="my_tax_declaration"),
    path("tax-declarations/", views.tax_declaration_admin_list, name="tax_declarations_admin"),
    path("tax-declarations/<int:pk>/verify/", views.tax_declaration_verify, name="tax_declaration_verify"),
    # Form 16
    path("form16/", views.form16_admin_list, name="form16_admin"),
    path("form16/generate/", views.form16_generate_all, name="form16_generate_all"),
    path("my-form16/", views.my_form16s, name="my_form16s"),
    # Statutory & accounting exports
    path("run/<int:pk>/tally-xml/", views.tally_xml_export, name="tally_xml"),
    path("run/<int:pk>/pf-ecr/", views.pf_ecr_export, name="pf_ecr"),
    path("run/<int:pk>/esi-return/", views.esi_return_export, name="esi_return"),
]
