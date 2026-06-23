from django.db import models


class SalaryComponent(models.Model):
    COMPONENT_TYPES = [
        ("earning", "Earning"),
        ("deduction", "Deduction"),
        ("employer_contribution", "Employer Contribution"),
    ]
    CALC_TYPES = [
        ("fixed", "Fixed Amount"),
        ("pct_of_basic", "% of Basic"),
        ("pct_of_gross", "% of Gross"),
        ("formula", "Custom Formula"),
        ("statutory", "Statutory (auto)"),
    ]
    STATUTORY_TYPES = [
        ("pf", "Provident Fund"),
        ("esi", "ESI"),
        ("pt", "Professional Tax"),
        ("lwf", "Labour Welfare Fund"),
        ("tds", "TDS"),
        ("pifss", "PIFSS (Kuwait)"),
        ("gosi", "GOSI (Saudi Arabia)"),
    ]

    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE, related_name="salary_components")
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=20)  # BASIC, HRA, CONV, PF_EMP, ESI_EMP ...
    component_type = models.CharField(max_length=30, choices=COMPONENT_TYPES)
    calc_type = models.CharField(max_length=30, choices=CALC_TYPES)
    calc_value = models.DecimalField(max_digits=10, decimal_places=4, null=True, blank=True)
    formula = models.TextField(blank=True)
    is_taxable = models.BooleanField(default=True)
    is_statutory = models.BooleanField(default=False)
    statutory_type = models.CharField(max_length=20, choices=STATUTORY_TYPES, blank=True)
    show_on_payslip = models.BooleanField(default=True)
    sequence_order = models.PositiveSmallIntegerField(default=50)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "salary_components"
        unique_together = ("tenant", "code")
        ordering = ["sequence_order", "name"]

    def __str__(self):
        return f"{self.code} — {self.name}"


class SalaryStructure(models.Model):
    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE, related_name="salary_structures")
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    components = models.ManyToManyField(SalaryComponent, through="SalaryStructureComponent", blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "salary_structures"
        unique_together = ("tenant", "name")

    def __str__(self):
        return self.name


class SalaryStructureComponent(models.Model):
    structure = models.ForeignKey(SalaryStructure, on_delete=models.CASCADE, related_name="structure_components")
    component = models.ForeignKey(SalaryComponent, on_delete=models.CASCADE)
    sequence_order = models.PositiveSmallIntegerField(default=50)

    class Meta:
        db_table = "salary_structure_components"
        unique_together = ("structure", "component")
        ordering = ["sequence_order"]


class EmployeeSalary(models.Model):
    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE)
    employee = models.ForeignKey("employees.Employee", on_delete=models.CASCADE, related_name="salaries")
    structure = models.ForeignKey(SalaryStructure, on_delete=models.CASCADE)
    effective_date = models.DateField()
    ctc_annual = models.DecimalField(max_digits=12, decimal_places=2)
    basic_monthly = models.DecimalField(max_digits=12, decimal_places=2)
    # Per-component overrides: {"HRA": 15000, "CONV": 2000}
    component_overrides = models.JSONField(default=dict, blank=True)
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, related_name="+")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "employee_salaries"
        ordering = ["-effective_date"]

    def __str__(self):
        return f"{self.employee} | CTC {self.ctc_annual} | from {self.effective_date}"


class StatutorySetting(models.Model):
    """Tenant-configurable statutory rates (PF, ESI, PT, LWF, PIFSS)."""
    STATUTORY_TYPES = [
        ("pf", "Provident Fund"),
        ("esi", "ESI"),
        ("pt", "Professional Tax"),
        ("lwf", "Labour Welfare Fund"),
        ("tds", "TDS"),
        ("pifss", "PIFSS (Kuwait)"),
        ("gosi", "GOSI (Saudi Arabia)"),
    ]

    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE, related_name="statutory_settings")
    statutory_type = models.CharField(max_length=20, choices=STATUTORY_TYPES)
    state_code = models.CharField(max_length=10, blank=True)  # for PT, LWF
    employee_rate = models.DecimalField(max_digits=6, decimal_places=4, null=True, blank=True)
    employer_rate = models.DecimalField(max_digits=6, decimal_places=4, null=True, blank=True)
    wage_ceiling = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    # PT slabs JSON: [{"min": 0, "max": 15000, "amount": 0}, {"min": 15001, "max": null, "amount": 200}]
    slabs = models.JSONField(default=list, blank=True)
    effective_date = models.DateField()
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "statutory_settings"
        unique_together = ("tenant", "statutory_type", "state_code", "effective_date")

    def __str__(self):
        return f"{self.tenant.subdomain} | {self.statutory_type} | {self.state_code or 'all'}"


class PayrollRun(models.Model):
    STATUS_CHOICES = [
        ("draft", "Draft"),
        ("processing", "Processing"),
        ("review", "Under Review"),
        ("approved", "Approved"),
        ("paid", "Paid"),
    ]

    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE, related_name="payroll_runs")
    year = models.PositiveSmallIntegerField()
    month = models.PositiveSmallIntegerField()  # 1–12
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="draft")
    total_employees = models.PositiveIntegerField(default=0)
    total_gross = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    total_deductions = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    total_net = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    total_employer_cost = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    run_by = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, related_name="+")
    run_at = models.DateTimeField(null=True, blank=True)
    approved_by = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="+")
    approved_at = models.DateTimeField(null=True, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    finance_journal_id = models.CharField(max_length=64, blank=True)
    finance_voucher_no = models.CharField(max_length=40, blank=True)
    finance_synced_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "payroll_runs"
        unique_together = ("tenant", "year", "month")
        ordering = ["-year", "-month"]

    def __str__(self):
        return f"{self.tenant.subdomain} | {self.year}-{self.month:02d} | {self.status}"


class PayrollRecord(models.Model):
    """One row per employee per payroll run."""

    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE)
    payroll_run = models.ForeignKey(PayrollRun, on_delete=models.CASCADE, related_name="records")
    employee = models.ForeignKey("employees.Employee", on_delete=models.CASCADE)

    lop_days = models.DecimalField(max_digits=4, decimal_places=1, default=0)
    lop_override = models.DecimalField(
        max_digits=4, decimal_places=1, null=True, blank=True,
        help_text="HR override for LOP days; blank = use attendance summary",
    )
    bonus_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    manual_deduction = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    hr_notes = models.TextField(blank=True)
    paid_days = models.DecimalField(max_digits=4, decimal_places=1, default=0)
    working_days = models.PositiveSmallIntegerField(default=0)

    # Flat earnings (denormalized for fast reporting)
    basic = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    hra = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    conveyance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    special_allowance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    other_earnings = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    gross_earnings = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    # Deductions
    pf_employee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    esi_employee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    professional_tax = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    lwf_employee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    tds = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    loan_deduction = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    other_deductions = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_deductions = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    # Employer contributions
    pf_employer = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    esi_employer = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    lwf_employer = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    net_payable = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    # Full breakup for payslip rendering
    earnings_detail = models.JSONField(default=dict)
    deductions_detail = models.JSONField(default=dict)

    is_locked = models.BooleanField(default=False)
    locked_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "payroll_records"
        unique_together = ("payroll_run", "employee")
        indexes = [
            models.Index(fields=["payroll_run"]),
            models.Index(fields=["employee"]),
        ]

    def __str__(self):
        return f"{self.employee} | {self.payroll_run}"


class PayslipTemplate(models.Model):
    """Per-tenant payslip layout — built-in regional packs or custom Jinja2 HTML."""

    LAYOUT_CHOICES = [
        ("builtin_in", "India — Standard"),
        ("builtin_kw", "Kuwait / GCC — Standard"),
        ("builtin_gcc", "GCC — Generic"),
        ("custom", "Custom HTML (Jinja2)"),
    ]

    FOOTER_MODES = [
        ("system_generated", "System generated — no signature required"),
        ("certified", "Certified — authorized signatory"),
        ("custom", "Custom footer text"),
        ("none", "No footer"),
    ]

    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE, related_name="payslip_templates")
    name = models.CharField(max_length=255)
    layout = models.CharField(max_length=20, choices=LAYOUT_CHOICES, default="builtin_in")
    template_html = models.TextField(
        blank=True,
        help_text="Jinja2 HTML body — only for Custom layout. Vars: record, employee, tenant, company, run, payslip.",
    )
    # Branding overrides (blank = use company letterhead / tenant logo)
    company_display_name = models.CharField(
        max_length=255,
        blank=True,
        help_text="Company name on payslip header. Leave blank to use letterhead name.",
    )
    company_address_override = models.TextField(
        blank=True,
        help_text="Address under company name. Leave blank to use letterhead address.",
    )
    payslip_title = models.CharField(
        max_length=255,
        blank=True,
        help_text='Document title. Use {month_year} e.g. "Payslip for the month of {month_year}".',
    )
    template_logo = models.ImageField(
        upload_to="payslip_templates/%Y/",
        null=True,
        blank=True,
        help_text="Optional logo for this template only. Leave blank to use company logo.",
    )
    # Footer / certification
    footer_mode = models.CharField(
        max_length=20,
        choices=FOOTER_MODES,
        default="system_generated",
    )
    footer_text = models.TextField(
        blank=True,
        help_text="Custom footer line, or certification note when mode is Certified.",
    )
    signatory_name_override = models.CharField(max_length=120, blank=True)
    signatory_title_override = models.CharField(max_length=120, blank=True)
    is_default = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="+")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "payslip_templates"
        ordering = ["-is_default", "name"]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if self.is_default:
            PayslipTemplate.objects.filter(tenant=self.tenant, is_default=True).exclude(pk=self.pk).update(
                is_default=False
            )


class Payslip(models.Model):
    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE)
    payroll_record = models.OneToOneField(PayrollRecord, on_delete=models.CASCADE, related_name="payslip")
    employee = models.ForeignKey("employees.Employee", on_delete=models.CASCADE, related_name="payslips")
    year = models.PositiveSmallIntegerField()
    month = models.PositiveSmallIntegerField()
    pdf = models.FileField(upload_to="payslips/%Y/%m/", null=True, blank=True)
    template = models.ForeignKey(
        PayslipTemplate, on_delete=models.SET_NULL, null=True, blank=True, related_name="generated_payslips"
    )
    layout_key = models.CharField(max_length=20, blank=True)
    generated_at = models.DateTimeField(null=True, blank=True)
    is_published = models.BooleanField(default=False)
    published_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "payslips"
        indexes = [models.Index(fields=["employee", "year", "month"])]

    def __str__(self):
        return f"Payslip {self.employee} {self.year}-{self.month:02d}"


class EmployeeLoan(models.Model):
    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE)
    employee = models.ForeignKey("employees.Employee", on_delete=models.CASCADE, related_name="loans")
    loan_type = models.CharField(max_length=50, blank=True)
    principal_amount = models.DecimalField(max_digits=12, decimal_places=2)
    outstanding_amount = models.DecimalField(max_digits=12, decimal_places=2)
    emi_amount = models.DecimalField(max_digits=10, decimal_places=2)
    total_installments = models.PositiveSmallIntegerField()
    paid_installments = models.PositiveSmallIntegerField(default=0)
    interest_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    disbursed_date = models.DateField()
    status = models.CharField(max_length=20, default="active")  # active | closed
    approved_by = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, related_name="+")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "employee_loans"

    def __str__(self):
        return f"{self.employee} — Loan ₹{self.principal_amount}"


class ExpenseClaim(models.Model):
    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE)
    employee = models.ForeignKey("employees.Employee", on_delete=models.CASCADE, related_name="expense_claims")
    category = models.CharField(max_length=100, blank=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    description = models.TextField(blank=True)
    receipt = models.FileField(upload_to="receipts/%Y/", null=True, blank=True)
    expense_date = models.DateField()
    status = models.CharField(max_length=20, default="pending")  # pending | approved | rejected | paid
    approved_by = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="+")
    approved_at = models.DateTimeField(null=True, blank=True)
    paid_in_run = models.ForeignKey(PayrollRun, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "expense_claims"


class TaxDeclaration(models.Model):
    """
    Employee's annual investment & exemption declarations used for TDS computation.
    One per (employee, financial_year).
    """
    REGIME_CHOICES = [
        ("new", "New Regime (default, FY 2025-26)"),
        ("old", "Old Regime (with deductions)"),
    ]
    STATUS_CHOICES = [
        ("draft", "Draft"),
        ("submitted", "Submitted (locked)"),
        ("verified", "Verified by HR"),
    ]

    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE, related_name="tax_declarations")
    employee = models.ForeignKey("employees.Employee", on_delete=models.CASCADE, related_name="tax_declarations")
    financial_year = models.CharField(max_length=9)  # e.g. "2025-26"

    regime = models.CharField(max_length=10, choices=REGIME_CHOICES, default="new")

    # HRA exemption inputs (only used in old regime)
    rent_paid_annual = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    is_metro_city = models.BooleanField(default=False)
    landlord_name = models.CharField(max_length=255, blank=True)
    landlord_pan = models.CharField(max_length=10, blank=True)

    # 80C — capped at Rs 1,50,000 (PPF, ELSS, life insurance, principal home loan, etc.)
    sec_80c_ppf = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    sec_80c_elss = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    sec_80c_lic = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    sec_80c_home_loan_principal = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    sec_80c_tuition_fees = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    sec_80c_other = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    # 80D — health insurance premium (own + parents)
    sec_80d_self = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    sec_80d_parents = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    sec_80d_parents_senior = models.BooleanField(default=False)

    # 80CCD(1B) — additional NPS investment, up to Rs 50,000
    sec_80ccd_1b_nps = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    # 80E — education loan interest (no cap)
    sec_80e_education_loan = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    # 80G — donations
    sec_80g_donations = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    # Section 24(b) — home loan interest (self-occupied capped at Rs 2,00,000)
    sec_24_home_loan_interest = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    # Other income to declare (used to bump TDS)
    other_income_annual = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="draft")
    submitted_at = models.DateTimeField(null=True, blank=True)
    verified_at = models.DateTimeField(null=True, blank=True)
    verified_by = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="+")
    hr_notes = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "tax_declarations"
        unique_together = ("tenant", "employee", "financial_year")
        ordering = ["-financial_year"]

    def __str__(self):
        return f"{self.employee} FY{self.financial_year} [{self.regime}]"

    @property
    def total_80c(self):
        return (self.sec_80c_ppf + self.sec_80c_elss + self.sec_80c_lic +
                self.sec_80c_home_loan_principal + self.sec_80c_tuition_fees +
                self.sec_80c_other)


class Form16(models.Model):
    """Annual TDS certificate (Part B generated by us, Part A uploaded from TRACES)."""
    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE, related_name="form16s")
    employee = models.ForeignKey("employees.Employee", on_delete=models.CASCADE, related_name="form16s")
    financial_year = models.CharField(max_length=9)  # "2024-25"
    assessment_year = models.CharField(max_length=9)  # "2025-26"

    part_b_pdf = models.FileField(upload_to="form16/part_b/%Y/", null=True, blank=True)
    part_a_pdf = models.FileField(upload_to="form16/part_a/%Y/", null=True, blank=True)

    gross_salary = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_exemptions = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    standard_deduction = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    chapter_via_deductions = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    taxable_income = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tax_payable = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    tds_deducted = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    regime = models.CharField(max_length=10, default="new")

    generated_at = models.DateTimeField(auto_now_add=True)
    generated_by = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, related_name="+")
    is_issued = models.BooleanField(default=False)
    issued_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "form16"
        unique_together = ("tenant", "employee", "financial_year")
        ordering = ["-financial_year"]

    def __str__(self):
        return f"Form16 {self.employee} FY{self.financial_year}"
