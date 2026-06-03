"""AI-powered billing actions — smart payment reminders."""
from __future__ import annotations

import logging
from datetime import date

from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

logger = logging.getLogger(__name__)


class SmartPaymentReminderView(APIView):
    """POST /api/v1/billing/invoices/<id>/smart-reminder/
    Generate a personalized payment reminder email using Claude.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, invoice_id):
        from .models import Invoice
        from apps.payments.models import Receipt
        from django.conf import settings

        try:
            invoice = Invoice.objects.select_related("customer", "company").get(
                pk=invoice_id, company__id__in=self._company_ids(request)
            )
        except Invoice.DoesNotExist:
            return Response({"detail": "Invoice not found"}, status=404)

        balance_due = invoice.grand_total - invoice.amount_paid
        if balance_due <= 0:
            return Response({"detail": "Invoice is fully paid"}, status=400)

        today = date.today()
        days_overdue = (today - invoice.due_date).days if invoice.due_date and invoice.due_date < today else 0

        # Payment history for this customer
        past_receipts = Receipt.objects.filter(
            company=invoice.company, customer=invoice.customer
        ).order_by("-date")[:5]
        payment_history = f"{past_receipts.count()} previous payments on record"
        avg_days = 0
        if past_receipts.exists():
            delays = [(r.date - invoice.date).days for r in past_receipts]
            avg_days = sum(delays) / len(delays)

        api_key = getattr(settings, "ANTHROPIC_API_KEY", "")
        if not api_key:
            # Return a template-based reminder if no AI
            return Response(self._template_reminder(invoice, balance_due, days_overdue))

        try:
            import anthropic
            client = anthropic.Anthropic(api_key=api_key)

            prompt = f"""Draft a professional payment reminder email. Keep it under 150 words.

Invoice details:
- Customer: {invoice.customer.name}
- Invoice #: {invoice.invoice_no}
- Amount due: ₹{balance_due:,.0f}
- Original due date: {invoice.due_date}
- Days overdue: {days_overdue}
- Customer payment history: {payment_history} (avg {avg_days:.0f} days to pay)
- Sending company: {invoice.company.name}

Tone: {'firm and urgent' if days_overdue > 30 else 'polite and friendly'}.
Include: subject line, greeting, payment details, closing.
DO NOT include placeholder brackets like [Bank Details] — omit anything you don't know.
"""

            response = client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=512,
                messages=[{"role": "user", "content": prompt}]
            )
            email_text = response.content[0].text

        except Exception as e:
            logger.exception("AI reminder generation failed")
            return Response(self._template_reminder(invoice, balance_due, days_overdue))

        return Response({
            "invoice_no": invoice.invoice_no,
            "customer": invoice.customer.name,
            "customer_email": invoice.customer.email,
            "amount_due": str(balance_due),
            "days_overdue": days_overdue,
            "email_draft": email_text,
        })

    def _template_reminder(self, invoice, balance_due, days_overdue):
        tone = "firmly request" if days_overdue > 30 else "kindly request"
        return {
            "invoice_no": invoice.invoice_no,
            "customer": invoice.customer.name,
            "customer_email": invoice.customer.email,
            "amount_due": str(balance_due),
            "days_overdue": days_overdue,
            "email_draft": f"""Subject: Payment Reminder — Invoice {invoice.invoice_no} — ₹{balance_due:,.0f}

Dear {invoice.customer.name},

I hope you are doing well. I am writing to {tone} payment for Invoice {invoice.invoice_no}
dated {invoice.date}, amounting to ₹{balance_due:,.0f}.

{"This invoice is now " + str(days_overdue) + " days overdue." if days_overdue > 0 else "This invoice is due soon."}

Please arrange payment at your earliest convenience. If you have any queries, please do not hesitate to contact us.

Thank you for your continued business.

Warm regards,
Accounts Team
{invoice.company.name}""",
        }

    def _company_ids(self, request):
        from apps.masters.models import Company
        return Company.objects.values_list("id", flat=True)
