"""Pre-production readiness checks for the FIN/SaaS platform."""
from __future__ import annotations

import os

from django.conf import settings
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Check FIN platform go-live prerequisites (DB, Redis, secrets, Razorpay placeholders)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--strict",
            action="store_true",
            help="Exit with code 1 if any check fails (for CI).",
        )

    def handle(self, *args, **options):
        strict = options["strict"]
        results: list[tuple[str, bool, str]] = []

        module = os.environ.get("DJANGO_SETTINGS_MODULE", "")
        is_prod = "production" in module

        engine = settings.DATABASES["default"]["ENGINE"]
        is_pg = "postgresql" in engine
        results.append((
            "PostgreSQL database",
            is_pg or not is_prod,
            engine if is_pg else f"{engine} (use PostgreSQL in production)",
        ))

        redis_url = getattr(settings, "REDIS_URL", "") or os.environ.get("REDIS_URL", "")
        redis_ok = redis_url.startswith("redis://") or redis_url.startswith("rediss://")
        results.append((
            "REDIS_URL configured",
            redis_ok or not is_prod,
            redis_url or "not configured",
        ))
        if redis_ok:
            try:
                import redis
                r = redis.from_url(redis_url)
                r.ping()
                results.append(("Redis ping", True, "OK"))
            except Exception as exc:
                results.append(("Redis ping", False, str(exc)[:120]))

        secret = getattr(settings, "SECRET_KEY", "")
        results.append((
            "SECRET_KEY strength",
            len(secret) >= 32 and "insecure" not in secret.lower() and "change-me" not in secret.lower(),
            f"{len(secret)} chars",
        ))

        sso = getattr(settings, "SSO_SHARED_SECRET", "") or os.environ.get("SSO_SHARED_SECRET", "")
        results.append((
            "SSO_SHARED_SECRET",
            bool(sso and "change-me" not in sso.lower() and "dev-sso" not in sso.lower()) or not is_prod,
            "set" if sso else "missing",
        ))

        rzp_id = getattr(settings, "RAZORPAY_KEY_ID", "")
        rzp_secret = getattr(settings, "RAZORPAY_KEY_SECRET", "")
        rzp_webhook = getattr(settings, "RAZORPAY_WEBHOOK_SECRET", "")
        results.append((
            "Razorpay keys (live checkout)",
            bool(rzp_id and rzp_secret) or not is_prod,
            "configured" if rzp_id and rzp_secret else "missing — use coupons or add keys for prod",
        ))
        results.append((
            "Razorpay webhook secret",
            bool(rzp_webhook) or not is_prod,
            "configured" if rzp_webhook else "missing for prod webhooks",
        ))

        debug = getattr(settings, "DEBUG", False)
        if is_prod:
            results.append(("DEBUG=False in production", not debug, str(debug)))

        self.stdout.write("")
        self.stdout.write(self.style.MIGRATE_HEADING("FIN platform go-live readiness"))
        self.stdout.write("")

        failed = 0
        for label, ok, detail in results:
            mark = self.style.SUCCESS("PASS") if ok else self.style.ERROR("FAIL")
            self.stdout.write(f"  [{mark}] {label}")
            self.stdout.write(f"         {detail}")
            if not ok:
                failed += 1

        self.stdout.write("")
        if failed:
            self.stdout.write(self.style.WARNING(f"{failed} check(s) need attention."))
            if strict:
                raise SystemExit(1)
        else:
            self.stdout.write(self.style.SUCCESS("All checks passed for current settings."))
