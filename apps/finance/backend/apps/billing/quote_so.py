"""Quotation + SO services. No JE — these are non-posting documents."""
from decimal import Decimal

from django.db import transaction

from apps.core.money import to_money
from .models import Quotation, QuotationLine, SalesOrder, SalesOrderLine


def _q_recompute_line(line):
    qty = to_money(line.quantity)
    price = to_money(line.unit_price)
    taxable = (qty * price).quantize(Decimal("0.0001"))
    tax = (taxable * to_money(line.tax_rate) / Decimal("100")).quantize(Decimal("0.0001"))
    line.line_total = taxable + tax


class QuotationService:
    @transaction.atomic
    def create(self, *, quote: Quotation, lines_data: list[dict]) -> Quotation:
        quote.save()
        for ld in lines_data:
            line = QuotationLine(quotation=quote, **ld)
            _q_recompute_line(line)
            line.save()
        quote.grand_total = sum((l.line_total for l in quote.lines.all()), Decimal("0"))
        quote.save()
        return quote

    @transaction.atomic
    def convert_to_so(self, quote: Quotation, *, so_no: str, place_of_supply: str) -> SalesOrder:
        so = SalesOrder.objects.create(
            company=quote.company, so_no=so_no, date=quote.date,
            customer=quote.customer, quotation=quote, place_of_supply=place_of_supply,
            notes=quote.notes,
        )
        for ql in quote.lines.all():
            line = SalesOrderLine(
                sales_order=so, item=ql.item, description=ql.description,
                quantity=ql.quantity, unit_price=ql.unit_price, tax_rate=ql.tax_rate,
            )
            _q_recompute_line(line)
            line.save()
        so.grand_total = sum((l.line_total for l in so.lines.all()), Decimal("0"))
        so.save()
        quote.status = Quotation.Status.ACCEPTED
        quote.save(update_fields=["status", "updated_at"])
        return so


class SalesOrderService:
    @transaction.atomic
    def create(self, *, so: SalesOrder, lines_data: list[dict]) -> SalesOrder:
        so.save()
        for ld in lines_data:
            line = SalesOrderLine(sales_order=so, **ld)
            _q_recompute_line(line)
            line.save()
        so.grand_total = sum((l.line_total for l in so.lines.all()), Decimal("0"))
        so.save()
        return so

    @transaction.atomic
    def convert_to_invoice(self, so: SalesOrder, *, invoice_no: str, fiscal_year_id: int, date, due_date=None, user=None):
        from .models import Invoice, InvoiceLine
        from .services import InvoiceService

        # Build lines for InvoiceService
        lines_data = [
            {
                "item": l.item, "description": l.description,
                "hsn_code": "" if not l.item else (l.item.hsn.code if l.item.hsn else ""),
                "quantity": l.quantity, "unit_price": l.unit_price,
                "discount_percent": Decimal("0"), "tax_rate": l.tax_rate,
            } for l in so.lines.all()
        ]
        invoice = Invoice(
            company=so.company, fiscal_year_id=fiscal_year_id, invoice_no=invoice_no,
            date=date, due_date=due_date, customer=so.customer,
            place_of_supply=so.place_of_supply, notes=f"Against SO {so.so_no}",
        )
        inv = InvoiceService().create_and_post(invoice=invoice, lines_data=lines_data, user=user)
        so.status = SalesOrder.Status.INVOICED
        so.save(update_fields=["status", "updated_at"])
        return inv
