"""One-shot HR demo preparation: seed data + QA smoke + feature verification."""
import subprocess
import sys
from pathlib import Path

from django.core.management import call_command
from django.core.management.base import BaseCommand

HR_ROOT = Path(__file__).resolve().parents[4]


class Command(BaseCommand):
    help = "Prepare HR tenant for demo/QA (seed + audit + smoke + verify). Idempotent."

    def add_arguments(self, parser):
        parser.add_argument("--subdomain", default="acme", help="Tenant subdomain (default: acme)")

    def handle(self, *args, **options):
        subdomain = options["subdomain"]
        self.stdout.write(self.style.MIGRATE_HEADING(f"Preparing HR demo for {subdomain}…"))

        call_command("seed_demo_data", subdomain=subdomain, skip_login=True)

        for script, label in ((HR_ROOT / "audit.py", "audit"), (HR_ROOT / "scripts" / "qa_smoke.py", "qa_smoke")):
            if script.exists():
                self.stdout.write(f"Running {label}…")
                rc = subprocess.call([sys.executable, str(script)])
                if rc != 0:
                    self.stdout.write(self.style.WARNING(f"{label} reported failures (exit {rc})"))

        call_command("verify_all_features")
        call_command("check_go_live_readiness")

        self.stdout.write(self.style.SUCCESS("HR demo ready."))
        self.stdout.write(f"  HR admin: demo@saptta.com / Demo@1234 → http://{subdomain}.localhost:8080/hr/")
