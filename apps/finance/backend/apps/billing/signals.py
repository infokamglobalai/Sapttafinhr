"""Post-save signals for billing.

When an invoice transitions to POSTED:
  1. Queue an async E-Invoice (IRN) generation via NIC IRP (stub by default).
  2. Queue an async E-Way Bill if invoice contains goods and total >= ₹50,000.

Both tasks are idempotent — they skip if the IRN / active EWB already exists,
or if the invoice doesn't match the criteria.
"""
from django.db import connection
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Invoice
from .tasks import generate_einvoice_for_invoice, generate_ewb_for_invoice


@receiver(post_save, sender=Invoice)
def trigger_tax_docs_on_post(sender, instance: Invoice, created: bool, **kwargs):
    if instance.status != Invoice.Status.POSTED:
        return
    schema = connection.schema_name

    # E-Invoice — task itself dedupes
    if not hasattr(instance, "einvoice"):
        generate_einvoice_for_invoice.delay(schema, instance.id)

    # E-Way Bill — task itself checks goods + threshold + dedupe
    generate_ewb_for_invoice.delay(schema, instance.id)
