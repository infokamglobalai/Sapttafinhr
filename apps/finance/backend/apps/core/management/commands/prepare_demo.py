"""One-shot FIN demo preparation: bootstrap tenant, users, coupons."""
from django.core.management import call_command
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Prepare FIN platform for demo (bootstrap_dev + coupons). Idempotent."

    def handle(self, *args, **options):
        call_command("bootstrap_dev")
        self.stdout.write(self.style.SUCCESS("FIN demo ready."))
        self.stdout.write("  Superadmin: sp@saptta.com / Saptta@2026 → /superadmin")
        self.stdout.write("  Demo admin: demo@saptta.com / Demo@1234")
        self.stdout.write("  Billing coupon: DEMO100 (100% off, no Razorpay needed)")
