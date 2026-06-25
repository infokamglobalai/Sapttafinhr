"""
Pre-production readiness checks for HR (email, Celery, secrets, database).

Usage:
    python manage.py check_go_live_readiness
    python manage.py check_go_live_readiness --strict
"""
from __future__ import annotations

import os

from django.conf import settings
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Check HR go-live prerequisites (SMTP, Redis/Celery, secrets, database)."

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

        # Database
        engine = settings.DATABASES["default"]["ENGINE"]
        is_pg = "postgresql" in engine
        results.append((
            "PostgreSQL database",
            is_pg or not is_prod,
            engine if is_pg else f"{engine} (use PostgreSQL in production)",
        ))

        # Redis / Celery broker
        broker = getattr(settings, "CELERY_BROKER_URL", "") or ""
        redis_ok = broker.startswith("redis://") or broker.startswith("rediss://")
        results.append((
            "Redis broker (CELERY_BROKER_URL)",
            redis_ok or not is_prod,
            broker or "not configured",
        ))

        if redis_ok:
            try:
                import redis
                r = redis.from_url(broker)
                r.ping()
                results.append(("Redis ping", True, "OK"))
            except Exception as exc:
                results.append(("Redis ping", False, str(exc)[:120]))

        # Email
        email_backend = getattr(settings, "EMAIL_BACKEND", "")
        console_backend = "console" in email_backend
        results.append((
            "Email backend (not console in prod)",
            not console_backend or not is_prod,
            email_backend,
        ))
        from_email = getattr(settings, "DEFAULT_FROM_EMAIL", "")
        results.append((
            "DEFAULT_FROM_EMAIL set",
            bool(from_email and "yourbrand" not in from_email.lower()),
            from_email or "missing",
        ))

        # Secrets
        secret = getattr(settings, "SECRET_KEY", "")
        results.append((
            "SECRET_KEY strength",
            len(secret) >= 32 and "insecure" not in secret.lower() and "change-me" not in secret.lower(),
            f"{len(secret)} chars",
        ))
        fkey = os.environ.get("FIELD_ENCRYPTION_KEY", "")
        results.append((
            "FIELD_ENCRYPTION_KEY",
            bool(fkey and "replace" not in fkey.lower()),
            "set" if fkey else "missing",
        ))

        # Celery beat schedules
        schedule = getattr(settings, "CELERY_BEAT_SCHEDULE", {})
        results.append((
            "Celery beat schedules",
            len(schedule) >= 5,
            f"{len(schedule)} task(s) configured",
        ))

        # Dev-only: eager tasks
        eager = getattr(settings, "CELERY_TASK_ALWAYS_EAGER", False)
        if is_prod:
            results.append((
                "Celery worker mode (not eager)",
                not eager,
                "eager=True runs tasks in-process — use hr-worker in production",
            ))

        self.stdout.write("")
        self.stdout.write(self.style.MIGRATE_HEADING("HR go-live readiness"))
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
            self.stdout.write(self.style.WARNING(
                f"{failed} check(s) need attention before production go-live."
            ))
            self.stdout.write("See apps/hr/docs/GO_LIVE_CHECKLIST.md")
            if strict:
                raise SystemExit(1)
        else:
            self.stdout.write(self.style.SUCCESS("All checks passed for current settings."))
