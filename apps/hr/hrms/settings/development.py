from decouple import config, Csv

from .base import *  # noqa

# ── SQLite (no PostgreSQL needed locally) ──────────────────────────────────
# timeout: wait up to 30s for a lock instead of failing immediately.
# WAL mode is enabled via a connection signal in apps/tenants/apps.py.
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db_dev.sqlite3",  # noqa: F405
        "OPTIONS": {
            "timeout": 30,
        },
    }
}

# ── No Redis in dev — use in-memory cache and DB-backed sessions ───────────
# When REDIS_URL is set (Docker), use Redis so billing/product caches are shared.
_redis_url = config("REDIS_URL", default="")
if _redis_url:
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.redis.RedisCache",
            "LOCATION": _redis_url,
        }
    }
else:
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        }
    }
SESSION_ENGINE = "django.contrib.sessions.backends.db"
SESSION_CACHE_ALIAS = "default"

# ── Celery: run tasks synchronously in-process (no worker needed) ──────────
CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True

DEBUG = True

if config("ENABLE_DEBUG_TOOLBAR", default=False, cast=bool):
    INSTALLED_APPS += ["debug_toolbar"]  # noqa
    MIDDLEWARE = ["debug_toolbar.middleware.DebugToolbarMiddleware"] + MIDDLEWARE  # noqa

INTERNAL_IPS = ["127.0.0.1"]

# Disable Whitenoise compression in dev
STATICFILES_STORAGE = "django.contrib.staticfiles.storage.StaticFilesStorage"

# Console unless SMTP is configured in .env / docker (see EMAIL_HOST or SMTP_HOST).
if not EMAIL_HOST:  # noqa: F405
    EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

# Native Vite dev defaults (platform :5173, HR :8001). Override via env for Docker/nginx.
PLATFORM_BASE_URL = config("PLATFORM_BASE_URL", default="http://127.0.0.1:5173")
HR_PUBLIC_BASE_URL = config("HR_PUBLIC_BASE_URL", default="http://127.0.0.1:8001")
LOGIN_URL = f"{PLATFORM_BASE_URL.rstrip('/')}/login?redirect=hr"

CSRF_TRUSTED_ORIGINS = config(
    "CSRF_TRUSTED_ORIGINS",
    default=(
        "http://127.0.0.1:5173,http://localhost:5173,"
        "http://127.0.0.1:8001,http://localhost:8001,"
        "http://hr.localhost,http://hr.localhost:8080,http://localhost:8080,"
        "http://127.0.0.1:8080"
    ),
    cast=Csv(),
)

# Local subdomain routing: sapttadev.localhost:8001
HRMS_TENANT_DOMAIN = "localhost"
HRMS_SUPERADMIN_DOMAIN = "localhost"
ALLOWED_HOSTS = ["localhost", "127.0.0.1", ".localhost"]

MFA_REQUIRED = False

# Expo / mobile dev — allow any origin in local development.
CORS_ALLOW_ALL_ORIGINS = True

