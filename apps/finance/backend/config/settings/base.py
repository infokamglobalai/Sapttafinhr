"""Base Django settings for fin-saptta."""
from datetime import timedelta
from pathlib import Path

import environ

BASE_DIR = Path(__file__).resolve().parent.parent.parent

env = environ.Env()
env_file = BASE_DIR.parent / ".env"
if env_file.exists():
    environ.Env.read_env(env_file)

SECRET_KEY = env("DJANGO_SECRET_KEY", default="insecure-dev-key-change-me")
DEBUG = env.bool("DJANGO_DEBUG", default=False)
ALLOWED_HOSTS = env.list("DJANGO_ALLOWED_HOSTS", default=["localhost", "127.0.0.1", ".localhost"])

# ===== Apps =====
SHARED_APPS = [
    "django_tenants",
    "apps.core",

    "django.contrib.contenttypes",
    "django.contrib.auth",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.admin",

    "rest_framework",
    "rest_framework_simplejwt",
    "corsheaders",
    "django_filters",
    "drf_spectacular",
    "simple_history",

    "apps.identity",
    "apps.saas",
]

TENANT_APPS = [
    "django.contrib.contenttypes",

    "apps.masters",
    "apps.ledger",
    "apps.billing",
    "apps.payments",
    "apps.reports",
    "apps.procurement",
    "apps.taxation",
    "apps.banking",
    "apps.inventory",
    "apps.assets",
    "apps.expenses",
    "apps.publicapi",
    "apps.notifications",
    "apps.portal",
    "apps.team",
]

INSTALLED_APPS = SHARED_APPS + [a for a in TENANT_APPS if a not in SHARED_APPS]

TENANT_MODEL = "core.Tenant"
TENANT_DOMAIN_MODEL = "core.Domain"

# ===== Middleware =====
MIDDLEWARE = [
    "apps.core.middleware.HeaderTenantMiddleware",
    "apps.saas.middleware.ProductEntitlementMiddleware",
    "apps.saas.middleware.SetupRequiredMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "simple_history.middleware.HistoryRequestMiddleware",
]

ROOT_URLCONF = "config.urls"
PUBLIC_SCHEMA_URLCONF = "config.urls_public"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

# ===== Database =====
DATABASES = {
    "default": {
        "ENGINE": "django_tenants.postgresql_backend",
        "NAME": env("POSTGRES_DB", default="finsaptta"),
        "USER": env("POSTGRES_USER", default="finsaptta"),
        "PASSWORD": env("POSTGRES_PASSWORD", default="finsaptta"),
        "HOST": env("POSTGRES_HOST", default="localhost"),
        "PORT": env("POSTGRES_PORT", default="5432"),
    }
}

DATABASE_ROUTERS = ("django_tenants.routers.TenantSyncRouter",)

# ===== Auth =====
AUTH_USER_MODEL = "identity.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# Prefer Argon2id when available (stronger than the PBKDF2 default), falling back
# to PBKDF2 so the app still boots before argon2-cffi is installed in the image.
# Existing PBKDF2 hashes keep verifying and transparently upgrade on next login.
PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.PBKDF2PasswordHasher",
    "django.contrib.auth.hashers.PBKDF2SHA1PasswordHasher",
]
try:
    import argon2  # noqa: F401  (argon2-cffi)

    PASSWORD_HASHERS.insert(0, "django.contrib.auth.hashers.Argon2PasswordHasher")
except ImportError:
    pass

# ===== I18N =====
LANGUAGE_CODE = "en-in"
TIME_ZONE = "Asia/Kolkata"
USE_I18N = True
USE_TZ = True

# ===== Static / Media =====
STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ===== DRF =====
REST_FRAMEWORK = {
    "EXCEPTION_HANDLER": "apps.core.exception_handler.exception_handler",
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
        "rest_framework.authentication.SessionAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
        # Bind the JWT to the tenant schema it was issued for (H2).
        "apps.identity.permissions.TokenWorkspaceMatchesSchema",
        # Enforce TenantMember role on tenant finance APIs (VIEWER → OWNER).
        "apps.team.permissions.TenantRolePermission",
    ),
    "DEFAULT_FILTER_BACKENDS": (
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ),
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 50,
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    # Brute-force protection: scoped throttles applied per auth endpoint.
    "DEFAULT_THROTTLE_CLASSES": (
        "rest_framework.throttling.ScopedRateThrottle",
    ),
    "DEFAULT_THROTTLE_RATES": {
        "login": env("THROTTLE_LOGIN", default="10/min"),
        "signup": env("THROTTLE_SIGNUP", default="5/hour"),
        "billing": env("THROTTLE_BILLING", default="30/min"),
        "password_reset": env("THROTTLE_PASSWORD_RESET", default="5/hour"),
        "email_verify": env("THROTTLE_EMAIL_VERIFY", default="5/hour"),
    },
}

# ===== Email =====
# SMTP login (EMAIL_HOST_USER) ≠ visible From (DEFAULT_FROM_EMAIL). Example:
#   EMAIL_HOST_USER=contact@saptta.com  (Gmail app password)
#   DEFAULT_FROM_EMAIL=Saptta <no-reply@saptta.com>
_email_host = env("EMAIL_HOST", default="") or env("SMTP_HOST", default="")
EMAIL_HOST = _email_host
EMAIL_PORT = env.int("EMAIL_PORT", default=env.int("SMTP_PORT", default=587))
EMAIL_HOST_USER = env("EMAIL_HOST_USER", default="") or env("SMTP_USER", default="")
EMAIL_HOST_PASSWORD = env("EMAIL_HOST_PASSWORD", default="") or env("SMTP_PASS", default="")
EMAIL_USE_TLS = env.bool("EMAIL_USE_TLS", default=True)
EMAIL_BACKEND = env(
    "EMAIL_BACKEND",
    default=(
        "django.core.mail.backends.smtp.EmailBackend"
        if _email_host
        else "django.core.mail.backends.console.EmailBackend"
    ),
)
DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL", default="Saptta <no-reply@saptta.com>")
SERVER_EMAIL = DEFAULT_FROM_EMAIL

# Public base URL of the SPA front door — used to build links in emails.
FRONTEND_BASE_URL = env("FRONTEND_BASE_URL", default="http://localhost:8080")

# ===== HR single sign-on (shared secret with the HR backend) =====
# When set, FIN can mint short-lived handoff tokens so the embedded HR app
# logs the user in without a second prompt. Must match HR's SSO_SHARED_SECRET.
SSO_SHARED_SECRET = env("SSO_SHARED_SECRET", default="")
# Internal base URL of the HR backend (Docker service DNS), for server-to-server
# HR workspace provisioning at signup. Empty disables auto-provisioning.
HR_INTERNAL_BASE_URL = env("HR_INTERNAL_BASE_URL", default="http://hr-backend:8000")
# Finance SPA URL template for HR → Fin handoff ({workspace} = tenant schema).
FINANCE_APP_BASE_URL = env("FINANCE_APP_BASE_URL", default="http://{workspace}.localhost:8080")

# ===== AI (Anthropic Claude) =====
# Get your key at https://console.anthropic.com
ANTHROPIC_API_KEY = env("ANTHROPIC_API_KEY", default="")

# ===== Billing (payment gateway) =====
RAZORPAY_KEY_ID = env("RAZORPAY_KEY_ID", default="")
RAZORPAY_KEY_SECRET = env("RAZORPAY_KEY_SECRET", default="")
RAZORPAY_WEBHOOK_SECRET = env("RAZORPAY_WEBHOOK_SECRET", default="")

# ===== Subscription lifecycle =====
TRIAL_PERIOD_DAYS = env.int("TRIAL_PERIOD_DAYS", default=14)
SUBSCRIPTION_GRACE_DAYS = env.int("SUBSCRIPTION_GRACE_DAYS", default=7)
TRIAL_REMINDER_DAYS = env.int("TRIAL_REMINDER_DAYS", default=3)

# Account security policy.
# When True, unverified users cannot obtain JWT tokens (login is blocked until
# they verify). Kept False by default so dev/demo flows aren't interrupted.
REQUIRE_EMAIL_VERIFICATION = env.bool("REQUIRE_EMAIL_VERIFICATION", default=False)
EMAIL_OTP_TIMEOUT_MINUTES = env.int("EMAIL_OTP_TIMEOUT_MINUTES", default=15)
# Email-verification + password-reset link lifetime (hours / Django default).
EMAIL_VERIFICATION_TIMEOUT_HOURS = env.int("EMAIL_VERIFICATION_TIMEOUT_HOURS", default=48)
PASSWORD_RESET_TIMEOUT = env.int("PASSWORD_RESET_TIMEOUT", default=60 * 60 * 24)  # 24h (seconds)

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=env.int("JWT_ACCESS_LIFETIME_MIN", default=15)),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=env.int("JWT_REFRESH_LIFETIME_DAYS", default=7)),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": False,
    "AUTH_HEADER_TYPES": ("Bearer",),
}

SPECTACULAR_SETTINGS = {
    "TITLE": "fin-saptta API",
    "DESCRIPTION": "Multi-tenant accounting platform",
    "VERSION": "0.1.0",
    "SERVE_INCLUDE_SCHEMA": False,
}

# ===== CORS =====
CORS_ALLOWED_ORIGINS = env.list(
    "CORS_ALLOWED_ORIGINS",
    default=["http://localhost:5173", "http://127.0.0.1:5173"],
)
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^http://[a-z0-9-]+\.localhost:5173$",
]

# ===== Celery =====
CELERY_BROKER_URL = env("REDIS_URL", default="redis://localhost:6379/0")
CELERY_RESULT_BACKEND = env("REDIS_URL", default="redis://localhost:6379/0")
CELERY_TIMEZONE = TIME_ZONE
CELERY_TASK_TRACK_STARTED = True

# Scheduled jobs — run inside the worker via -B flag.
# Crontab times are in Asia/Kolkata (CELERY_TIMEZONE).
from celery.schedules import crontab  # noqa: E402

CELERY_BEAT_SCHEDULE = {
    # ── Platform: nightly database backup ────────────────────────────────
    "db-backup-nightly": {
        "task": "apps.core.tasks.run_db_backup",
        "schedule": crontab(hour=2, minute=30),
    },
    # ── SaaS subscription lifecycle (pay-first: no trial jobs) ───────────
    # Lapsed paid subs: ACTIVE past period -> PAST_DUE -> CANCELLED after grace.
    "expire-overdue-subscriptions-daily": {
        "task": "apps.saas.tasks.expire_overdue_subscriptions",
        "schedule": crontab(hour=1, minute=15),
    },
    # Materialize recurring invoice templates every morning
    "recurring-invoices-daily": {
        "task": "apps.billing.tasks.run_recurring_invoices",
        "schedule": crontab(hour=6, minute=0),
    },
    # Daily overdue invoice reminders (escalates by age)
    "overdue-reminders-daily": {
        "task": "apps.billing.tasks.send_overdue_reminders",
        "schedule": crontab(hour=9, minute=0),
    },
    # Last day of every month: run depreciation
    "monthly-depreciation": {
        "task": "apps.assets.tasks.run_monthly_depreciation_all",
        "schedule": crontab(hour=23, minute=30, day_of_month="28-31"),
    },
    # Daily stock reorder alerts
    "stock-reorder-check": {
        "task": "apps.inventory.tasks.check_reorder_levels",
        "schedule": crontab(hour=8, minute=0),
    },
    # 5th of every month: remind to close the prior month's books
    "books-closing-reminder": {
        "task": "apps.notifications.tasks.books_closing_reminder",
        "schedule": crontab(hour=10, minute=0, day_of_month=5),
    },
    # Nightly ledger anomaly detection (after-hours entries, duplicates, round numbers)
    "ledger-anomaly-detection": {
        "task": "apps.ledger.tasks.detect_ledger_anomalies_all",
        "schedule": crontab(hour=6, minute=30),
    },
    # Hourly automation engine — overdue invoices, bills due, low stock alerts
    "automation-engine-hourly": {
        "task": "apps.core.tasks.run_automation_rules",
        "schedule": crontab(minute=0),  # every hour on the hour
    },
    # Daily AP alerts: bills due in next 3 days + overdue
    "vendor-bill-due-alerts": {
        "task": "apps.procurement.tasks.send_vendor_bill_due_alerts",
        "schedule": crontab(hour=9, minute=30),
    },
    # Daily PDC presentation alerts
    "pdc-presentation-check": {
        "task": "apps.banking.tasks.check_pdc_presentation",
        "schedule": crontab(hour=7, minute=0),
    },
    # Apr 1 — auto-create the new fiscal year
    "fiscal-year-rollover": {
        "task": "apps.masters.tasks.auto_create_next_fy",
        "schedule": crontab(hour=0, minute=5, day_of_month=1, month_of_year=4),
    },
}

# ===== Logging =====
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "json": {
            "format": '{"time": "%(asctime)s", "level": "%(levelname)s", "name": "%(name)s", "msg": "%(message)s"}',
        },
    },
    "handlers": {
        "console": {"class": "logging.StreamHandler", "formatter": "json"},
    },
    "root": {"handlers": ["console"], "level": "INFO"},
}

# ===== Encryption / MFA =====
FIELD_ENCRYPTION_KEY = env("FIELD_ENCRYPTION_KEY", default=env("HR_FIELD_ENCRYPTION_KEY", default=""))
MFA_REQUIRED = env.bool("MFA_REQUIRED", default=False)
MFA_CHALLENGE_MAX_AGE_SECONDS = env.int("MFA_CHALLENGE_MAX_AGE_SECONDS", default=300)
