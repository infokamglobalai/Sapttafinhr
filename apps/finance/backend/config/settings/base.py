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
]

INSTALLED_APPS = SHARED_APPS + [a for a in TENANT_APPS if a not in SHARED_APPS]

TENANT_MODEL = "core.Tenant"
TENANT_DOMAIN_MODEL = "core.Domain"

# ===== Middleware =====
MIDDLEWARE = [
    "django_tenants.middleware.main.TenantMainMiddleware",
    "apps.saas.middleware.ProductEntitlementMiddleware",
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
    ),
    "DEFAULT_FILTER_BACKENDS": (
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ),
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 50,
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
}

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
