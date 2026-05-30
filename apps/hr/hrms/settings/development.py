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

INSTALLED_APPS += ["debug_toolbar"]  # noqa

MIDDLEWARE = ["debug_toolbar.middleware.DebugToolbarMiddleware"] + MIDDLEWARE  # noqa

INTERNAL_IPS = ["127.0.0.1"]

# Disable Whitenoise compression in dev
STATICFILES_STORAGE = "django.contrib.staticfiles.storage.StaticFilesStorage"

EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
