"""Indian standard Chart of Accounts template, seeded for new companies."""

# Each row: (code, name, type, parent_code, is_postable)
INDIAN_COA = [
    # ASSETS
    ("1000", "Assets", "ASSET", None, False),
    ("1100", "Current Assets", "ASSET", "1000", False),
    ("1110", "Cash in Hand", "ASSET", "1100", True),
    ("1120", "Bank Accounts", "ASSET", "1100", False),
    ("1121", "Bank — Current Account", "ASSET", "1120", True),
    ("1130", "Accounts Receivable", "ASSET", "1100", True),
    ("1140", "Inventory", "ASSET", "1100", True),
    ("1150", "GST Input — CGST", "ASSET", "1100", True),
    ("1151", "GST Input — SGST", "ASSET", "1100", True),
    ("1152", "GST Input — IGST", "ASSET", "1100", True),
    ("1155", "VAT Input", "ASSET", "1100", True),  # GCC VAT (input/recoverable)
    ("1200", "Fixed Assets", "ASSET", "1000", False),
    ("1210", "Furniture & Fixtures", "ASSET", "1200", True),
    ("1220", "Office Equipment", "ASSET", "1200", True),

    # LIABILITIES
    ("2000", "Liabilities", "LIABILITY", None, False),
    ("2100", "Current Liabilities", "LIABILITY", "2000", False),
    ("2110", "Accounts Payable", "LIABILITY", "2100", True),
    ("2150", "GST Output — CGST", "LIABILITY", "2100", True),
    ("2151", "GST Output — SGST", "LIABILITY", "2100", True),
    ("2152", "GST Output — IGST", "LIABILITY", "2100", True),
    ("2155", "VAT Output", "LIABILITY", "2100", True),  # GCC VAT (output payable)
    ("2160", "TDS Payable", "LIABILITY", "2100", True),

    # EQUITY
    ("3000", "Equity", "EQUITY", None, False),
    ("3100", "Owner's Capital", "EQUITY", "3000", True),
    ("3200", "Retained Earnings", "EQUITY", "3000", True),

    # INCOME
    ("4000", "Income", "INCOME", None, False),
    ("4100", "Sales", "INCOME", "4000", True),
    ("4200", "Service Revenue", "INCOME", "4000", True),
    ("4900", "Other Income", "INCOME", "4000", True),
    # Realized FX gain/loss on settling foreign-currency invoices/bills.
    # Debit for losses, credit for gains — net forex P&L in one account.
    ("4950", "Foreign Exchange Gain/Loss", "INCOME", "4000", True),

    # EXPENSE
    ("5000", "Expenses", "EXPENSE", None, False),
    ("5100", "Cost of Goods Sold", "EXPENSE", "5000", True),
    ("5200", "Salaries & Wages", "EXPENSE", "5000", True),
    ("5300", "Rent", "EXPENSE", "5000", True),
    ("5400", "Utilities", "EXPENSE", "5000", True),
    ("5500", "Office Expenses", "EXPENSE", "5000", True),
    ("5900", "Bank Charges", "EXPENSE", "5000", True),
]


def seed_coa(company):
    """Seed the Indian COA template on a company."""
    from .models import Account

    code_to_account: dict[str, Account] = {}
    for code, name, type_, parent_code, is_postable in INDIAN_COA:
        parent = code_to_account.get(parent_code) if parent_code else None
        acc, _ = Account.objects.get_or_create(
            company=company,
            code=code,
            defaults={
                "name": name,
                "type": type_,
                "parent": parent,
                "is_postable": is_postable,
            },
        )
        code_to_account[code] = acc
    return code_to_account


# Well-known account codes — referenced by posting policies.
CODE_CASH = "1110"
CODE_BANK = "1121"
CODE_AR = "1130"
CODE_AP = "2110"
CODE_GST_INPUT_CGST = "1150"
CODE_GST_INPUT_SGST = "1151"
CODE_GST_INPUT_IGST = "1152"
CODE_GST_OUTPUT_CGST = "2150"
CODE_GST_OUTPUT_SGST = "2151"
CODE_GST_OUTPUT_IGST = "2152"
CODE_VAT_INPUT = "1155"
CODE_VAT_OUTPUT = "2155"
CODE_SALES = "4100"
CODE_FX_GAINLOSS = "4950"
CODE_RETAINED_EARNINGS = "3200"


def account_by_code(company, code: str):
    """Lookup helper used by posting policies."""
    from .models import Account
    return Account.objects.get(company=company, code=code)


def ensure_account(company, code: str, name: str, type_: str, parent_code: str | None = None):
    """Fetch a postable account by code, creating it if missing.

    Used by VAT posting so companies created before the VAT accounts existed
    (i.e. before GCC localization) still get them on first VAT posting.
    """
    from .models import Account

    existing = Account.objects.filter(company=company, code=code).first()
    if existing:
        return existing
    parent = (
        Account.objects.filter(company=company, code=parent_code).first()
        if parent_code else None
    )
    return Account.objects.create(
        company=company, code=code, name=name, type=type_,
        parent=parent, is_postable=True,
    )
