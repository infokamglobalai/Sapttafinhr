"""Comprehensive E2E QA script.

Run via:
    docker compose exec backend python manage.py shell < scripts/qa_e2e.py

Exercises every business flow, every Celery task, every report endpoint,
and asserts the double-entry + balance-sheet invariants after each operation.
"""
import json
import sys
import traceback
from datetime import date, timedelta
from decimal import Decimal

from django.contrib.contenttypes.models import ContentType
from django.core.exceptions import ValidationError
from django_tenants.utils import schema_context

PASSED = []
FAILED = []


def check(name, fn):
    try:
        result = fn()
        PASSED.append((name, result))
        print(f"  ✓ {name}: {result if result is not None else 'OK'}")
    except Exception as e:
        tb = traceback.format_exc(limit=3)
        FAILED.append((name, f"{type(e).__name__}: {e}", tb))
        print(f"  ✗ {name}: {type(e).__name__}: {e}")


def assert_balanced(label):
    from apps.ledger.models import JournalEntry, JournalLine
    from django.db.models import Sum
    agg = JournalLine.objects.filter(
        journal_entry__status=JournalEntry.Status.POSTED,
    ).aggregate(d=Sum("debit"), c=Sum("credit"))
    d, c = agg["d"] or Decimal("0"), agg["c"] or Decimal("0")
    if d != c:
        raise AssertionError(f"{label}: TB unbalanced (D={d} C={c})")
    return f"D=C={d}"


# ============================================================
print("\n========== PHASE 1: AUTH + MASTERS ==========")
with schema_context("acme"):
    from apps.identity.models import User
    from apps.masters.models import (
        Account, Company, FiscalYear, HSNCode, Item, Party, CostCenter, Project,
    )

    check("public-schema user count", lambda: User.objects.count())
    check("acme company exists", lambda: Company.objects.filter(name="Acme Pvt Ltd").get().name)
    check("active FY exists", lambda: FiscalYear.objects.filter(is_active=True).get().name)
    check("COA seeded (≥30 accounts)", lambda: f"{Account.objects.count()} accounts" if Account.objects.count() >= 30 else (_ for _ in ()).throw(AssertionError(f"only {Account.objects.count()}")))
    check("parties seeded", lambda: f"{Party.objects.count()} parties")
    check("items seeded", lambda: f"{Item.objects.count()} items")
    check("HSN codes seeded", lambda: f"{HSNCode.objects.count()} HSN codes")

    # Create a fresh customer to test edit flow
    def _create_party():
        p, _ = Party.objects.update_or_create(
            company=Company.objects.first(),
            name="QA Test Customer",
            defaults={
                "kind": Party.Kind.CUSTOMER, "gstin": "27QATEST123C1Z5",  # 15 chars
                "email": "qa@test.local", "phone": "9999911111",
                "state_code": "27", "billing_address": "QA Street, Pune",
            },
        )
        return p.id
    check("create/update party", _create_party)

    def _create_item():
        comp = Company.objects.first()
        hsn = HSNCode.objects.first()
        i, _ = Item.objects.update_or_create(
            company=comp, sku="QA-WIDGET",
            defaults={
                "name": "QA Widget", "kind": Item.Kind.GOODS, "unit": "Nos",
                "hsn": hsn, "sale_price": Decimal("1000"), "purchase_price": Decimal("700"),
                "tax_rate": Decimal("18"),
            },
        )
        return i.id
    check("create/update item (goods)", _create_item)

    def _create_cost_center():
        cc, _ = CostCenter.objects.update_or_create(
            company=Company.objects.first(), code="QA-CC1",
            defaults={"name": "QA Sales Dept"},
        )
        return cc.id
    check("create cost center", _create_cost_center)

    def _create_project():
        p, _ = Project.objects.update_or_create(
            company=Company.objects.first(), code="QA-PROJ1",
            defaults={"name": "QA Pilot Project"},
        )
        return p.id
    check("create project", _create_project)


# ============================================================
print("\n========== PHASE 2: SALES FLOW (Quote → SO → Invoice → Receipt → CN) ==========")
with schema_context("acme"):
    from apps.billing.models import CreditNote, Invoice, Quotation, SalesOrder
    from apps.billing.quote_so import QuotationService, SalesOrderService
    from apps.billing.services import CreditNoteService, InvoiceService
    from apps.payments.models import Receipt
    from apps.payments.services import ReceiptService
    from apps.masters.models import Account

    company = Company.objects.first()
    fy = FiscalYear.objects.filter(is_active=True).first()
    customer = Party.objects.filter(name="QA Test Customer").first() or Party.objects.filter(kind="CUSTOMER").first()
    item = Item.objects.filter(sku="QA-WIDGET").first() or Item.objects.first()

    # Quotation
    def _quote():
        q = Quotation(company=company, quote_no="QA-QUO-001", date=date.today(),
                      customer=customer, notes="QA quote")
        QuotationService().create(quote=q, lines_data=[
            {"item": item, "description": "QA widget x5", "quantity": Decimal("5"),
             "unit_price": Decimal("1000"), "tax_rate": Decimal("18")},
        ])
        return f"{q.quote_no} total={q.grand_total}"
    check("quotation create", _quote)

    def _quote_convert():
        q = Quotation.objects.get(quote_no="QA-QUO-001")
        so = QuotationService().convert_to_so(q, so_no="QA-SO-001", place_of_supply="27")
        return f"converted to {so.so_no}"
    check("quotation → SO convert", _quote_convert)

    def _so_convert():
        so = SalesOrder.objects.get(so_no="QA-SO-001")
        inv = SalesOrderService().convert_to_invoice(
            so, invoice_no="QA-INV-001", fiscal_year_id=fy.id,
            date=date.today(), due_date=date.today() + timedelta(days=15),
        )
        return f"converted to {inv.invoice_no}, total={inv.grand_total}, JE={inv.journal_entry_id}"
    check("SO → Invoice convert (auto-posts JE)", _so_convert)
    check("TB balanced after SO→Inv", lambda: assert_balanced("post-SO-convert"))

    # Direct invoice — inter-state (IGST path)
    def _direct_inv():
        cust2 = Party.objects.filter(kind=Party.Kind.CUSTOMER).exclude(name="QA Test Customer").first()
        inv = Invoice(company=company, fiscal_year=fy, invoice_no="QA-INV-002",
                      date=date.today(), customer=cust2, place_of_supply="29",  # KA
                      notes="QA IGST test")
        InvoiceService().create_and_post(invoice=inv, lines_data=[
            {"item": item, "description": "QA widget x10 IGST", "hsn_code": "8523",
             "quantity": Decimal("10"), "unit_price": Decimal("1000"),
             "discount_percent": Decimal("0"), "tax_rate": Decimal("18")},
        ])
        return f"{inv.invoice_no} taxable={inv.taxable_amount} IGST={inv.igst} total={inv.grand_total}"
    check("inter-state invoice (IGST)", _direct_inv)
    check("TB balanced after IGST inv", lambda: assert_balanced("post-IGST"))

    # Receipt — manual allocation
    def _receipt_manual():
        bank_gl = Account.objects.get(company=company, code="1121")
        inv = Invoice.objects.get(invoice_no="QA-INV-001")
        r = Receipt(company=company, fiscal_year=fy, receipt_no="QA-REC-001",
                    date=date.today(), customer=customer, mode=Receipt.Mode.BANK,
                    reference="UTR-QA-1", amount=Decimal("3000"),
                    deposit_account=bank_gl)
        ReceiptService().create_and_post(
            receipt=r, allocations=[{"invoice": inv, "amount": Decimal("3000")}],
        )
        return f"{r.receipt_no} JE={r.journal_entry_id}"
    check("receipt manual allocation", _receipt_manual)

    # Receipt — auto FIFO (no allocations passed, customer has open invoice)
    def _receipt_fifo():
        bank_gl = Account.objects.get(company=company, code="1121")
        inv = Invoice.objects.get(invoice_no="QA-INV-001")
        remaining_due = inv.grand_total - inv.amount_paid
        r = Receipt(company=company, fiscal_year=fy, receipt_no="QA-REC-002",
                    date=date.today(), customer=customer, mode=Receipt.Mode.BANK,
                    reference="UTR-QA-FIFO", amount=remaining_due,
                    deposit_account=bank_gl)
        ReceiptService().create_and_post(receipt=r, allocations=[])  # empty → FIFO
        inv.refresh_from_db()
        return f"{r.receipt_no} FIFO allocs={r.allocations.count()} inv balance now={inv.balance_due}"
    check("receipt FIFO auto-allocation", _receipt_fifo)
    check("TB balanced after receipts", lambda: assert_balanced("post-receipts"))

    # Credit Note
    def _cn():
        inv = Invoice.objects.get(invoice_no="QA-INV-002")
        cn = CreditNoteService().create_and_post(
            company=company, fiscal_year=fy, note_no="QA-CN-001",
            date=date.today(), invoice=inv, taxable_amount=Decimal("2000"),
            reason="QA — partial return",
        )
        return f"{cn.note_no} total={cn.grand_total} JE={cn.journal_entry_id}"
    check("credit note (proportional GST reversal)", _cn)
    check("TB balanced after CN", lambda: assert_balanced("post-CN"))


# ============================================================
print("\n========== PHASE 3: PROCUREMENT (PO → GRN → Bill → Payment) ==========")
with schema_context("acme"):
    from apps.procurement.models import GRN, PurchaseOrder, VendorBill, VendorPayment
    from apps.procurement.services import (
        GRNService, PurchaseOrderService, VendorBillService, VendorPaymentService,
    )

    vendor = Party.objects.filter(kind=Party.Kind.VENDOR).first()
    expense_acct = Account.objects.get(company=company, code="5500")

    def _po():
        po = PurchaseOrder(company=company, fiscal_year=fy, po_no="QA-PO-001",
                           date=date.today(), vendor=vendor, notes="QA PO")
        PurchaseOrderService().create(po=po, lines_data=[
            {"item": item, "description": "QA widget bulk", "hsn_code": "8523",
             "quantity": Decimal("20"), "unit_price": Decimal("700"),
             "tax_rate": Decimal("18")},
        ])
        return f"{po.po_no} total={po.grand_total}"
    check("PO create", _po)

    def _grn():
        po = PurchaseOrder.objects.get(po_no="QA-PO-001")
        grn = GRN(company=company, grn_no="QA-GRN-001", date=date.today(), purchase_order=po)
        GRNService().create(grn=grn, receipts=[
            {"po_line": po.lines.first(), "received_qty": Decimal("20")},
        ])
        return f"{grn.grn_no} lines={grn.lines.count()}"
    check("GRN receive all", _grn)

    def _bill():
        po = PurchaseOrder.objects.get(po_no="QA-PO-001")
        bill = VendorBill(company=company, fiscal_year=fy, bill_no="QA-VB-001",
                          date=date.today(), due_date=date.today() + timedelta(days=30),
                          vendor=vendor, purchase_order=po, place_of_supply="27")
        VendorBillService().create_and_post(bill=bill, lines_data=[
            {"item": item, "expense_account": expense_acct, "po_line": po.lines.first(),
             "description": "QA widget", "hsn_code": "8523",
             "quantity": Decimal("20"), "unit_price": Decimal("700"),
             "tax_rate": Decimal("18"),
             "tds_section": "194Q", "tds_rate": Decimal("0.1")},
        ])
        return f"{bill.bill_no} total={bill.grand_total} TDS={bill.tds_amount} balance={bill.balance_due}"
    check("vendor bill (GST + TDS)", _bill)
    check("TB balanced after bill", lambda: assert_balanced("post-bill"))

    def _vpay():
        bill = VendorBill.objects.get(bill_no="QA-VB-001")
        bank_gl = Account.objects.get(company=company, code="1121")
        vp = VendorPayment(company=company, fiscal_year=fy, payment_no="QA-VP-001",
                           date=date.today(), vendor=vendor, mode=VendorPayment.Mode.BANK,
                           reference="UTR-QA-V", amount=bill.balance_due,
                           paid_from_account=bank_gl)
        VendorPaymentService().create_and_post(payment=vp, allocations=[
            {"bill": bill, "amount": bill.balance_due},
        ])
        return f"{vp.payment_no} JE={vp.journal_entry_id}"
    check("vendor payment with allocation", _vpay)
    check("TB balanced after vendor pay", lambda: assert_balanced("post-vendor-pay"))


# ============================================================
print("\n========== PHASE 4: INVENTORY (Movements + Transfer) ==========")
with schema_context("acme"):
    from apps.inventory.models import StockLevel, StockMovement, Warehouse
    from apps.inventory.services import record_movement, transfer_stock

    def _wh():
        wh1, _ = Warehouse.objects.get_or_create(
            company=company, code="QA-WH1",
            defaults={"name": "QA Warehouse 1", "is_default": False},
        )
        wh2, _ = Warehouse.objects.get_or_create(
            company=company, code="QA-WH2",
            defaults={"name": "QA Warehouse 2"},
        )
        return f"{wh1.code}, {wh2.code}"
    check("warehouses created", _wh)

    def _stock_in():
        wh = Warehouse.objects.get(code="QA-WH1")
        mv = record_movement(
            company=company, date=date.today(), item=item, warehouse=wh,
            kind=StockMovement.Kind.OPENING, quantity=Decimal("50"),
            unit_cost=Decimal("700"), reference="QA OPENING",
        )
        return f"opening mv #{mv.id} qty={mv.quantity}"
    check("stock IN (opening 50)", _stock_in)

    def _stock_out():
        wh = Warehouse.objects.get(code="QA-WH1")
        mv = record_movement(
            company=company, date=date.today(), item=item, warehouse=wh,
            kind=StockMovement.Kind.SALE, quantity=Decimal("-5"),
            unit_cost=Decimal("700"), reference="QA SALE",
        )
        return f"sale mv #{mv.id} qty={mv.quantity}"
    check("stock OUT (-5)", _stock_out)

    def _transfer():
        wh1 = Warehouse.objects.get(code="QA-WH1")
        wh2 = Warehouse.objects.get(code="QA-WH2")
        out_mv, in_mv = transfer_stock(
            company=company, date=date.today(), item=item,
            from_warehouse=wh1, to_warehouse=wh2,
            quantity=Decimal("10"), reference="QA TRANSFER",
        )
        return f"OUT#{out_mv.id} IN#{in_mv.id}"
    check("stock TRANSFER (10 units)", _transfer)

    def _stock_sum():
        wh1 = Warehouse.objects.get(code="QA-WH1")
        wh2 = Warehouse.objects.get(code="QA-WH2")
        l1 = StockLevel.objects.get(item=item, warehouse=wh1)
        l2 = StockLevel.objects.get(item=item, warehouse=wh2)
        total = l1.on_hand + l2.on_hand
        expected = Decimal("50") - Decimal("5")  # 50 in, 5 out, 10 transferred but net=0
        if total != expected:
            raise AssertionError(f"expected {expected}, got {total}")
        return f"WH1={l1.on_hand}, WH2={l2.on_hand}, total={total}"
    check("stock levels match expected", _stock_sum)


# ============================================================
print("\n========== PHASE 5: FIXED ASSETS + DEPRECIATION ==========")
with schema_context("acme"):
    from apps.assets.models import DepreciationEntry, FixedAsset
    from apps.assets.services import run_depreciation_for_asset

    def _fa():
        # Need 3 accounts: asset(1210), accum depr(use 2150 trick — we need a LIABILITY), expense(5xxx)
        # In COA: 1210 Furniture (Asset), 5500 Office Expenses. Need an accum-depr account.
        # Reuse 2110 AP — sketchy but valid for testing. Real prod would create dedicated 1219/2199.
        asset_acct = Account.objects.get(company=company, code="1210")
        accum_acct = Account.objects.get(company=company, code="2110")  # AP for test
        exp_acct = Account.objects.get(company=company, code="5500")
        fa, _ = FixedAsset.objects.get_or_create(
            company=company, code="QA-FA-001",
            defaults={
                "name": "QA Laptop", "category": "Computers",
                "asset_account": asset_acct, "accum_depr_account": accum_acct,
                "expense_account": exp_acct,
                "purchase_date": date(2025, 4, 1),
                "purchase_cost": Decimal("60000"), "salvage_value": Decimal("0"),
                "method": FixedAsset.Method.SLM, "useful_life_years": Decimal("3"),
                "current_book_value": Decimal("60000"),
            },
        )
        return f"{fa.code} cost={fa.purchase_cost} BV={fa.current_book_value}"
    check("fixed asset created", _fa)

    def _depr():
        fa = FixedAsset.objects.get(code="QA-FA-001")
        # Use a date past last_depreciated to avoid the "already" guard
        period_end = date.today()
        if fa.last_depreciated:
            period_end = fa.last_depreciated + timedelta(days=31)
        entry = run_depreciation_for_asset(fa, period_end=period_end, fiscal_year=fy, user=None)
        fa.refresh_from_db()
        return f"depr ₹{entry.amount} BV now={fa.current_book_value} JE={entry.journal_entry_id}"
    check("monthly depreciation posts JE", _depr)
    check("TB balanced after depreciation", lambda: assert_balanced("post-depr"))


# ============================================================
print("\n========== PHASE 6: EXPENSE CLAIM (submit → approve → JE) ==========")
with schema_context("acme"):
    from apps.expenses.models import ExpenseClaim, ExpenseClaimLine
    from apps.expenses.services import approve_claim, submit_claim

    def _claim_create():
        admin = User.objects.filter(is_superuser=True).first()
        # Make next claim no unique
        next_no = f"QA-EXP-{ExpenseClaim.objects.filter(claim_no__startswith='QA-EXP-').count()+1:03d}"
        c = ExpenseClaim.objects.create(
            company=company, fiscal_year=fy, claim_no=next_no,
            date=date.today(), employee=admin, description="QA test claim",
        )
        ExpenseClaimLine.objects.create(
            claim=c, date=date.today(),
            expense_account=Account.objects.get(company=company, code="5500"),
            description="QA expense", amount=Decimal("500"),
        )
        return f"{c.claim_no} status={c.status}"
    check("claim created (DRAFT)", _claim_create)

    def _claim_submit():
        c = ExpenseClaim.objects.filter(claim_no__startswith="QA-EXP-", status="DRAFT").order_by("-id").first()
        submit_claim(c)
        c.refresh_from_db()
        return f"{c.claim_no} status={c.status} total={c.total}"
    check("claim submitted", _claim_submit)

    def _claim_approve():
        admin = User.objects.filter(is_superuser=True).first()
        c = ExpenseClaim.objects.filter(claim_no__startswith="QA-EXP-", status="SUBMITTED").order_by("-id").first()
        approve_claim(c, approver=admin)
        c.refresh_from_db()
        return f"{c.claim_no} status={c.status} JE={c.journal_entry_id}"
    check("claim approved + JE posted", _claim_approve)
    check("TB balanced after claim", lambda: assert_balanced("post-claim"))


# ============================================================
print("\n========== PHASE 7: TAXATION (E-Invoice + E-Way + GSTR exports) ==========")
with schema_context("acme"):
    from apps.taxation.services import (
        generate_einvoice, generate_eway_bill, gstr1_json, gstr3b_json, hsn_summary,
    )

    def _einv():
        inv = Invoice.objects.get(invoice_no="QA-INV-002")
        rec = generate_einvoice(inv)
        return f"IRN={rec.irn[:16]}… ack={rec.ack_no}"
    check("E-Invoice IRN generation", _einv)

    def _ewb():
        inv = Invoice.objects.get(invoice_no="QA-INV-002")
        rec = generate_eway_bill(inv, distance_km=200)
        return f"EWB={rec.eway_no} valid_until={rec.valid_until.date()}"
    check("E-Way Bill generation", _ewb)

    def _hsn():
        rows = hsn_summary(company.id, date.today().replace(day=1), date.today())["rows"]
        return f"{len(rows)} HSN row(s)"
    check("HSN summary", _hsn)

    def _gstr1():
        period = date.today().strftime("%m%Y")
        out = gstr1_json(company.id, period)
        return f"b2b={len(out.get('b2b', []))} b2cs={len(out.get('b2cs', []))}"
    check("GSTR-1 JSON build", _gstr1)

    def _gstr3b():
        period = date.today().strftime("%m%Y")
        out = gstr3b_json(company.id, period)
        return f"taxable={out['sup_details']['osup_det']['txval']}"
    check("GSTR-3B JSON build", _gstr3b)


# ============================================================
print("\n========== PHASE 8: REPORTS ==========")
with schema_context("acme"):
    from apps.ledger.reports import trial_balance
    from apps.reports import queries

    def _tb():
        rows = trial_balance(company.id)
        d = sum((r["debit"] for r in rows), Decimal("0"))
        c = sum((r["credit"] for r in rows), Decimal("0"))
        if d != c:
            raise AssertionError(f"TB unbalanced D={d} C={c}")
        return f"{len(rows)} rows, D=C={d}"
    check("trial balance", _tb)

    def _pnl():
        d = queries.profit_and_loss(company.id, date(2026, 4, 1), date.today())
        return f"income={d['total_income']} expense={d['total_expense']} net={d['net_profit']}"
    check("P&L", _pnl)

    def _bs():
        d = queries.balance_sheet(company.id, date.today())
        if not d["is_balanced"]:
            raise AssertionError(f"BS not balanced: A={d['total_assets']} L={d['total_liabilities']} E={d['total_equity']}")
        return f"A={d['total_assets']} L={d['total_liabilities']} E={d['total_equity']} balanced=True"
    check("balance sheet (must balance)", _bs)

    check("cash flow", lambda: queries.cash_flow(company.id, date(2026, 4, 1), date.today())["net_change"])
    check("day book today", lambda: f"{len(queries.day_book(company.id, date.today()))} JE lines")
    check("party ledger (QA cust)", lambda: f"{len(queries.party_ledger(company.id, customer.id, date(2026, 4, 1), date.today())['rows'])} rows")
    check("AR aging", lambda: f"{len(queries.ar_aging(company.id, date.today())['rows'])} customers")
    check("sales register", lambda: f"{len(queries.sales_register(company.id, date(2026, 4, 1), date.today())['rows'])} invoices")
    check("cost-center P&L", lambda: f"{len(queries.cost_center_pnl(company.id, date(2026, 4, 1), date.today()))} centers")
    check("consolidation P&L", lambda: queries.consolidation_pnl([company.id], date(2026, 4, 1), date.today())["net"])
    check("dashboard KPIs", lambda: queries.dashboard(company.id, date.today())["cash_balance"])
    check("audit log", lambda: f"{len(queries.audit_log(company.id))} events")


# ============================================================
print("\n========== PHASE 9: CELERY TASKS (run each synchronously) ==========")
from apps.assets.tasks import run_monthly_depreciation_all
from apps.banking.tasks import check_pdc_presentation
from apps.billing.tasks import (
    generate_einvoice_for_invoice, generate_ewb_for_invoice,
    run_recurring_invoices, send_overdue_reminders,
)
from apps.inventory.tasks import check_reorder_levels
from apps.masters.tasks import auto_create_next_fy
from apps.notifications.tasks import books_closing_reminder
from apps.procurement.tasks import send_vendor_bill_due_alerts

check("celery: send_overdue_reminders", send_overdue_reminders)
check("celery: run_recurring_invoices", run_recurring_invoices)
check("celery: run_monthly_depreciation_all", run_monthly_depreciation_all)
check("celery: check_reorder_levels", check_reorder_levels)
check("celery: books_closing_reminder", books_closing_reminder)
check("celery: send_vendor_bill_due_alerts", send_vendor_bill_due_alerts)
check("celery: check_pdc_presentation", check_pdc_presentation)
check("celery: auto_create_next_fy", auto_create_next_fy)


# ============================================================
print("\n========== PHASE 10: INVARIANT VIOLATIONS (must fail) ==========")
with schema_context("acme"):
    from apps.ledger.models import JournalEntry, JournalLine
    from apps.ledger.posting import Cr, Dr, LedgerService

    def _unbalanced_je():
        cash = Account.objects.get(company=company, code="1110")
        sales = Account.objects.get(company=company, code="4100")
        try:
            LedgerService().post_manual(
                company=company, fiscal_year=fy,
                voucher_no="QA-UNBAL", entry_date=date.today(),
                narration="should fail", lines=[
                    Dr(cash, Decimal("100")),
                    Cr(sales, Decimal("99")),  # off by 1
                ],
            )
            raise AssertionError("expected ValidationError")
        except ValidationError:
            return "correctly rejected"
    check("unbalanced JE rejected", _unbalanced_je)

    def _nonpostable():
        group = Account.objects.get(company=company, code="1000")  # group, is_postable=False
        cash = Account.objects.get(company=company, code="1110")
        try:
            LedgerService().post_manual(
                company=company, fiscal_year=fy,
                voucher_no="QA-NONPOST", entry_date=date.today(),
                narration="should fail", lines=[
                    Dr(group, Decimal("100")),
                    Cr(cash, Decimal("100")),
                ],
            )
            raise AssertionError("expected ValidationError")
        except ValidationError:
            return "correctly rejected"
    check("non-postable account rejected", _nonpostable)

    def _period_lock():
        # Use a fresh company for this test to avoid breaking other state
        company.books_closed_until = date.today() + timedelta(days=30)
        company.save()
        cash = Account.objects.get(company=company, code="1110")
        sales = Account.objects.get(company=company, code="4100")
        try:
            LedgerService().post_manual(
                company=company, fiscal_year=fy,
                voucher_no="QA-LOCK", entry_date=date.today(),
                narration="should fail (period locked)",
                lines=[Dr(cash, Decimal("100")), Cr(sales, Decimal("100"))],
            )
            raise AssertionError("expected ValidationError")
        except ValidationError:
            return "correctly rejected"
        finally:
            company.books_closed_until = None
            company.save()
    check("period lock blocks JE", _period_lock)


# ============================================================
print("\n========== PHASE 11: FINAL INVARIANTS ==========")
with schema_context("acme"):
    check("FINAL TB balanced", lambda: assert_balanced("final"))
    from apps.reports import queries
    def _final_bs():
        d = queries.balance_sheet(company.id, date.today())
        if not d["is_balanced"]:
            raise AssertionError(f"A={d['total_assets']} L={d['total_liabilities']} E={d['total_equity']}")
        return f"A={d['total_assets']} = L+E={Decimal(d['total_liabilities']) + Decimal(d['total_equity'])}"
    check("FINAL BS balanced", _final_bs)


# ============================================================
print("\n" + "=" * 60)
print(f"  PASSED: {len(PASSED)}")
print(f"  FAILED: {len(FAILED)}")
print("=" * 60)
if FAILED:
    print("\n--- FAILURES ---")
    for name, err, tb in FAILED:
        print(f"\n✗ {name}\n  {err}")
sys.exit(0 if not FAILED else 1)
