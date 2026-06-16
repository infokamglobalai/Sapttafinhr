import datetime
from decimal import Decimal
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django_tenants.utils import schema_context

from apps.core.models import Tenant
from apps.masters.models import Company, FiscalYear, Account, Party, Item, HSNCode
from apps.identity.models import User
from apps.billing.models import Invoice, InvoiceLine
from apps.billing.services import InvoiceService
from apps.payments.models import Receipt, ReceiptAllocation
from apps.payments.services import ReceiptService
from apps.procurement.models import VendorBill, VendorBillLine, VendorPayment, VendorPaymentAllocation
from apps.procurement.services import VendorBillService, VendorPaymentService
from apps.expenses.models import ExpenseClaim, ExpenseClaimLine
from apps.expenses.services import submit_claim, approve_claim
from apps.taxation.models import TDSDeduction
from apps.ledger.models import JournalEntry, JournalLine
from apps.ledger.posting import Dr, Cr, LedgerService

class Command(BaseCommand):
    help = "Seed transactional dummy data for Finance."

    def add_arguments(self, parser):
        parser.add_argument("--tenant", default="acme", help="Tenant subdomain/schema name")

    def handle(self, *args, **options):
        schema_name = options["tenant"]
        
        try:
            tenant = Tenant.objects.get(schema_name=schema_name)
        except Tenant.DoesNotExist:
            raise CommandError(f"Tenant '{schema_name}' does not exist.")

        self.stdout.write(self.style.NOTICE(f"Seeding dummy transactions into schema '{schema_name}'..."))

        with schema_context(schema_name):
            self.seed_tenant_data(tenant)

    def seed_tenant_data(self, tenant):
        company = Company.objects.first()
        if not company:
            self.stdout.write(self.style.WARNING("No company found for this tenant! Creating default company."))
            company = Company.objects.create(
                name="Acme Pvt Ltd",
                legal_name="Acme Private Limited",
                state_code="27",  # Maharashtra
                base_currency="INR"
            )

        fy = FiscalYear.objects.filter(is_active=True).first()
        if not fy:
            today = datetime.date.today()
            if today.month >= 4:
                start = datetime.date(today.year, 4, 1)
                end = datetime.date(today.year + 1, 3, 31)
            else:
                start = datetime.date(today.year - 1, 4, 1)
                end = datetime.date(today.year, 3, 31)
            fy_name = f"FY{str(start.year)[-2:]}-{str(end.year)[-2:]}"
            fy = FiscalYear.objects.create(
                company=company,
                name=fy_name,
                start_date=start,
                end_date=end,
                is_active=True
            )

        user = User.objects.filter(email="demo@saptta.com").first()
        if not user:
            user = User.objects.first()

        # 1. Reset old transactional data (in order to avoid foreign key issues)
        self.stdout.write("Cleaning up existing transactional data...")
        with transaction.atomic():
            # De-link invoice journal entries first to avoid protect/set_null issues
            Invoice.objects.update(journal_entry=None)
            VendorBill.objects.update(journal_entry=None)
            VendorPayment.objects.update(journal_entry=None)
            Receipt.objects.update(journal_entry=None)
            ExpenseClaim.objects.update(journal_entry=None)

            ReceiptAllocation.objects.all().delete()
            Receipt.objects.all().delete()
            InvoiceLine.objects.all().delete()
            Invoice.objects.all().delete()

            VendorPaymentAllocation.objects.all().delete()
            VendorPayment.objects.all().delete()
            VendorBillLine.objects.all().delete()
            VendorBill.objects.all().delete()
            TDSDeduction.objects.all().delete()

            ExpenseClaimLine.objects.all().delete()
            ExpenseClaim.objects.all().delete()

            # Bypass validation error for posted entries
            JournalEntry.objects.update(status=JournalEntry.Status.DRAFT)
            JournalLine.objects.all().delete()
            JournalEntry.objects.all().delete()

        self.stdout.write("Clean up complete. Seeding new data...")

        # 2. Setup master data (Parties, items)
        # We need specific accounts
        bank_account = Account.objects.get(company=company, code="1121")
        ar_account = Account.objects.get(company=company, code="1130")
        ap_account = Account.objects.get(company=company, code="2110")
        sales_account = Account.objects.get(company=company, code="4100")
        
        # Expense accounts
        rent_account = Account.objects.get(company=company, code="5300")
        utilities_account = Account.objects.get(company=company, code="5400")
        office_account = Account.objects.get(company=company, code="5500")
        capital_account = Account.objects.get(company=company, code="3100")

        # Get or create additional parties
        shield_corp, _ = Party.objects.get_or_create(
            company=company, name="Shield Corporation",
            defaults={
                "kind": Party.Kind.CUSTOMER, "gstin": "27AAACS1234D1Z6",
                "email": "billing@shield.test", "state_code": "27",
                "billing_address": "S.H.I.E.L.D HQ, Mumbai 400001",
                "credit_limit": 1000000,
            }
        )
        oscorp, _ = Party.objects.get_or_create(
            company=company, name="Oscorp Industries",
            defaults={
                "kind": Party.Kind.CUSTOMER, "gstin": "29AAACO5678F1Z9",
                "email": "accounts@oscorp.test", "state_code": "29",
                "billing_address": "Oscorp Tower, Bangalore 560001",
                "credit_limit": 500000,
            }
        )

        globex = Party.objects.filter(company=company, name="Globex Industries").first()
        initech = Party.objects.filter(company=company, name="Initech Pvt Ltd").first()
        reliable = Party.objects.filter(company=company, name="Reliable Stationers").first()

        power_corp, _ = Party.objects.get_or_create(
            company=company, name="Power Corp Maharashtra",
            defaults={
                "kind": Party.Kind.VENDOR, "gstin": "27AAAPC9090G1Z3",
                "email": "billing@powercorp.test", "state_code": "27",
                "billing_address": "Substation 4, MIDC, Pune 411019",
            }
        )
        apex_landlord, _ = Party.objects.get_or_create(
            company=company, name="Apex Real Estate",
            defaults={
                "kind": Party.Kind.VENDOR, "gstin": "27AAAAL1212F1Z1",
                "email": "rentals@apex.test", "state_code": "27",
                "billing_address": "Apex Chambers, Pune 411001",
            }
        )

        # Items
        consulting_item = Item.objects.filter(company=company, sku="SVC-CONSULT").first()
        laptop_item = Item.objects.filter(company=company, sku="HW-LAPTOP").first()
        handbook_item = Item.objects.filter(company=company, sku="BOOK-MNGMT").first()

        # Seed manual capital investment
        self.stdout.write("Seeding opening balances / owner capital...")
        LedgerService().post_manual(
            company=company,
            fiscal_year=fy,
            voucher_no="JV-2026-001",
            entry_date=datetime.date(2026, 4, 1),
            narration="Initial owner equity investment in bank account",
            lines=[
                Dr(bank_account, 1000000, "Capital investment infusion"),
                Cr(capital_account, 1000000, "Capital investment infusion"),
            ],
            user=user
        )

        # 3. Seed Sales Invoices
        self.stdout.write("Seeding Sales Invoices...")
        invoices_data = [
            # customer, date, due_offset, items (item, qty, unit_price, tax_rate, desc)
            (shield_corp, datetime.date(2026, 4, 10), 30, [
                (consulting_item, 40, 2500, 18, "IT Consulting Hours - April"),
                (laptop_item, 2, 65000, 18, "Laptops for Shield Consultants"),
            ], "INV-2026-001"),
            (oscorp, datetime.date(2026, 4, 25), 15, [
                (consulting_item, 20, 2500, 18, "Project management consulting"),
                (handbook_item, 5, 750, 0, "Management Handbooks"),
            ], "INV-2026-002"),
            (globex, datetime.date(2026, 5, 5), 30, [
                (consulting_item, 80, 2500, 18, "Retainer hours for May"),
            ], "INV-2026-003"),
            (initech, datetime.date(2026, 5, 12), 30, [
                (laptop_item, 4, 65000, 18, "Laptops for Initech HR team"),
            ], "INV-2026-004"),
            (shield_corp, datetime.date(2026, 5, 28), 30, [
                (consulting_item, 60, 2500, 18, "IT Security Assessment"),
            ], "INV-2026-005"),
            (globex, datetime.date(2026, 6, 2), 30, [
                (consulting_item, 50, 2500, 18, "Retainer hours for June"),
                (handbook_item, 10, 750, 0, "Leadership books"),
            ], "INV-2026-006"),
            (oscorp, datetime.date(2026, 6, 10), 15, [
                (consulting_item, 30, 2500, 18, "Advisory hours for June"),
            ], "INV-2026-007"),
            (initech, datetime.date(2026, 6, 14), 30, [
                (laptop_item, 1, 65000, 18, "Replacement laptop"),
            ], "INV-2026-008"),
        ]

        posted_invoices = {}
        for customer, entry_date, due_offset, items_spec, inv_no in invoices_data:
            inv = Invoice(
                company=company,
                fiscal_year=fy,
                invoice_no=inv_no,
                date=entry_date,
                due_date=entry_date + datetime.timedelta(days=due_offset),
                customer=customer,
                place_of_supply=customer.state_code,
                status=Invoice.Status.DRAFT
            )
            lines_data = []
            for item, qty, price, tax, desc in items_spec:
                lines_data.append({
                    "item": item,
                    "description": desc,
                    "hsn_code": item.hsn.code if item and item.hsn else "8523",
                    "quantity": Decimal(str(qty)),
                    "unit_price": Decimal(str(price)),
                    "tax_rate": Decimal(str(tax))
                })
            InvoiceService().create_and_post(invoice=inv, lines_data=lines_data, user=user)
            posted_invoices[inv_no] = inv

        # 4. Seed Customer Receipts (Customer Payments)
        # Let's pay all April and May invoices. June invoices will be outstanding.
        self.stdout.write("Seeding Customer Receipts...")
        receipts_data = [
            # customer, date, amount, receipt_no
            (shield_corp, datetime.date(2026, 5, 8), posted_invoices["INV-2026-001"].grand_total, "REC-2026-001"),
            (oscorp, datetime.date(2026, 5, 10), posted_invoices["INV-2026-002"].grand_total, "REC-2026-002"),
            (globex, datetime.date(2026, 6, 4), posted_invoices["INV-2026-003"].grand_total, "REC-2026-003"),
            (initech, datetime.date(2026, 6, 11), posted_invoices["INV-2026-004"].grand_total, "REC-2026-004"),
            (shield_corp, datetime.date(2026, 6, 12), posted_invoices["INV-2026-005"].grand_total, "REC-2026-005"),
        ]

        for customer, entry_date, amount, rec_no in receipts_data:
            rec = Receipt(
                company=company,
                fiscal_year=fy,
                receipt_no=rec_no,
                date=entry_date,
                customer=customer,
                mode=Receipt.Mode.BANK,
                amount=amount,
                deposit_account=bank_account,
                status=Receipt.Status.DRAFT
            )
            ReceiptService().create_and_post(receipt=rec, allocations=[], user=user)

        # 5. Seed Vendor Bills (Purchases)
        self.stdout.write("Seeding Vendor Bills...")
        bills_data = [
            # vendor, date, due_offset, expense_account, amount, tax, tds_sec, tds_rate, desc, bill_no
            (apex_landlord, datetime.date(2026, 4, 1), 10, rent_account, 50000, 18, "194I", 10, "Office rent for April 2026", "RENT-2604"),
            (power_corp, datetime.date(2026, 4, 20), 15, utilities_account, 12000, 18, "", 0, "Electricity bill April 2026", "ELE-2604"),
            (reliable, datetime.date(2026, 4, 22), 30, office_account, 4500, 12, "", 0, "Office stationery and files", "REL-9081"),
            (apex_landlord, datetime.date(2026, 5, 1), 10, rent_account, 50000, 18, "194I", 10, "Office rent for May 2026", "RENT-2605"),
            (power_corp, datetime.date(2026, 5, 18), 15, utilities_account, 15000, 18, "", 0, "Electricity bill May 2026", "ELE-2605"),
            (apex_landlord, datetime.date(2026, 6, 1), 10, rent_account, 50000, 18, "194I", 10, "Office rent for June 2026", "RENT-2606"),
            (power_corp, datetime.date(2026, 6, 15), 15, utilities_account, 14000, 18, "", 0, "Electricity bill June 2026", "ELE-2606"),
        ]

        posted_bills = {}
        for vendor, entry_date, due_offset, exp_acc, amount, tax_rate, tds_sec, tds_rate, desc, bill_no in bills_data:
            bill = VendorBill(
                company=company,
                fiscal_year=fy,
                bill_no=bill_no,
                date=entry_date,
                due_date=entry_date + datetime.timedelta(days=due_offset),
                vendor=vendor,
                place_of_supply=company.state_code,
                status=VendorBill.Status.DRAFT
            )
            lines_data = [{
                "expense_account": exp_acc,
                "description": desc,
                "quantity": Decimal("1"),
                "unit_price": Decimal(str(amount)),
                "tax_rate": Decimal(str(tax_rate)),
                "tds_section": tds_sec,
                "tds_rate": Decimal(str(tds_rate))
            }]
            VendorBillService().create_and_post(bill=bill, lines_data=lines_data, user=user)
            posted_bills[bill_no] = bill

        # 6. Seed Vendor Payments
        # Let's pay April and May rent, and April electricity/stationery.
        self.stdout.write("Seeding Vendor Payments...")
        payments_data = [
            (apex_landlord, datetime.date(2026, 4, 8), posted_bills["RENT-2604"], "PMT-2026-001"),
            (power_corp, datetime.date(2026, 5, 2), posted_bills["ELE-2604"], "PMT-2026-002"),
            (reliable, datetime.date(2026, 5, 10), posted_bills["REL-9081"], "PMT-2026-003"),
            (apex_landlord, datetime.date(2026, 5, 8), posted_bills["RENT-2605"], "PMT-2026-004"),
            (power_corp, datetime.date(2026, 6, 2), posted_bills["ELE-2605"], "PMT-2026-005"),
        ]

        for vendor, entry_date, bill, pmt_no in payments_data:
            net_payable = bill.grand_total - bill.tds_amount
            pmt = VendorPayment(
                company=company,
                fiscal_year=fy,
                payment_no=pmt_no,
                date=entry_date,
                vendor=vendor,
                mode=VendorPayment.Mode.BANK,
                amount=net_payable,
                paid_from_account=bank_account,
                status=VendorPayment.Status.DRAFT
            )
            VendorPaymentService().create_and_post(
                payment=pmt,
                allocations=[{"bill": bill, "amount": net_payable}],
                user=user
            )

        # 7. Seed Expense Claims
        self.stdout.write("Seeding Employee Expense Claims...")
        if user:
            claims_data = [
                # description, date, status, lines (exp_acc, amount, desc)
                ("Travel to client site", datetime.date(2026, 4, 15), ExpenseClaim.Status.APPROVED, [
                    (office_account, 1200, "Taxi fare to Globex office"),
                    (office_account, 850, "Lunch with client team"),
                ], "CLM-2026-001"),
                ("Internet & Phone allowances", datetime.date(2026, 5, 28), ExpenseClaim.Status.APPROVED, [
                    (utilities_account, 1500, "Broadband internet bill May"),
                    (utilities_account, 800, "Mobile recharge May"),
                ], "CLM-2026-002"),
                ("Office desk setup", datetime.date(2026, 6, 12), ExpenseClaim.Status.SUBMITTED, [
                    (office_account, 4500, "Ergonomic chair purchase"),
                ], "CLM-2026-003"),
            ]

            for desc, entry_date, status, lines_spec, claim_no in claims_data:
                claim = ExpenseClaim.objects.create(
                    company=company,
                    fiscal_year=fy,
                    claim_no=claim_no,
                    date=entry_date,
                    employee=user,
                    description=desc,
                    status=ExpenseClaim.Status.DRAFT
                )
                for exp_acc, amount, l_desc in lines_spec:
                    ExpenseClaimLine.objects.create(
                        claim=claim,
                        date=entry_date,
                        expense_account=exp_acc,
                        description=l_desc,
                        amount=Decimal(str(amount))
                    )
                
                # Submit the claim
                submit_claim(claim)
                
                # Approve if requested
                if status == ExpenseClaim.Status.APPROVED:
                    approve_claim(claim, approver=user, reimburse_account_code="2110")

        self.stdout.write(self.style.SUCCESS("Finance seeding completed successfully!"))
