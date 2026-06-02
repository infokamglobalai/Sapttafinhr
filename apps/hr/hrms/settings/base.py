"""
Base settings shared by all environments.
"""
import os
from pathlib import Path
from decouple import config, Csv

BASE_DIR = Path(__file__).resolve().parent.parent.parent

SECRET_KEY = config("SECRET_KEY")

DEBUG = config("DEBUG", default=False, cast=bool)

ALLOWED_HOSTS = config("ALLOWED_HOSTS", default="localhost,127.0.0.1", cast=Csv())

# ---------------------------------------------------------------------------
# Application definition
# ---------------------------------------------------------------------------
DJANGO_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.humanize",
]

THIRD_PARTY_APPS = [
    "django_htmx",
    "simple_history",
    "django_celery_beat",
    "django_celery_results",
    "corsheaders",
    "storages",
]

LOCAL_APPS = [
    "apps.tenants",
    "apps.accounts",
    "apps.employees",
    "apps.attendance",
    "apps.leaves",
    "apps.payroll",
    "apps.hr_ops",
    "apps.performance",
    "apps.recruitment",
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "django_htmx.middleware.HtmxMiddleware",
    "apps.tenants.middleware.TenantMiddleware",  # must be after auth
    "simple_history.middleware.HistoryRequestMiddleware",
    "crum.CurrentRequestUserMiddleware",
]

ROOT_URLCONF = "hrms.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
                "apps.tenants.context_processors.tenant_context",
            ],
        },
    },
]

WSGI_APPLICATION = "hrms.wsgi.application"

# ---------------------------------------------------------------------------
# Database
# ---------------------------------------------------------------------------
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": config("DB_NAME"),
        "USER": config("DB_USER"),
        "PASSWORD": config("DB_PASSWORD"),
        "HOST": config("DB_HOST", default="localhost"),
        "PORT": config("DB_PORT", default="5432"),
        "CONN_MAX_AGE": 60,
        "OPTIONS": {
            "connect_timeout": 10,
        },
    }
}

# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------
AUTH_USER_MODEL = "accounts.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator", "OPTIONS": {"min_length": 8}},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

AUTHENTICATION_BACKENDS = [
    "apps.accounts.backends.TenantAuthBackend",
    "django.contrib.auth.backends.ModelBackend",  # fallback for superadmin
]

LOGIN_URL = "/auth/login/"
LOGIN_REDIRECT_URL = "/dashboard/"
LOGOUT_REDIRECT_URL = "/auth/login/"

# ---------------------------------------------------------------------------
# Internationalization
# ---------------------------------------------------------------------------
LANGUAGE_CODE = "en-us"
TIME_ZONE = "Asia/Kolkata"
USE_I18N = True
USE_TZ = True

# ---------------------------------------------------------------------------
# Static & media
# ---------------------------------------------------------------------------
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_DIRS = [BASE_DIR / "static"]
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# auth.W004: email uniqueness is enforced per-tenant via unique_together, not globally.
SILENCED_SYSTEM_CHECKS = ["auth.W004"]

# ---------------------------------------------------------------------------
# Redis & Celery
# ---------------------------------------------------------------------------
REDIS_URL = config("REDIS_URL", default="redis://localhost:6379/0")

CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": REDIS_URL,
    }
}

SESSION_ENGINE = "django.contrib.sessions.backends.cache"
SESSION_CACHE_ALIAS = "default"
SESSION_COOKIE_AGE = 43200  # 12 hours

CELERY_BROKER_URL = REDIS_URL
CELERY_RESULT_BACKEND = "django-db"
CELERY_CACHE_BACKEND = "default"
CELERY_TIMEZONE = TIME_ZONE
CELERY_TASK_TRACK_STARTED = True
CELERY_TASK_TIME_LIMIT = 30 * 60  # 30 minutes max per task
CELERY_BEAT_SCHEDULER = "django_celery_beat.schedulers:DatabaseScheduler"

# ---------------------------------------------------------------------------
# DigitalOcean Spaces (S3-compatible)
# ---------------------------------------------------------------------------
USE_DO_SPACES = config("USE_DO_SPACES", default=False, cast=bool)

if USE_DO_SPACES:
    DEFAULT_FILE_STORAGE = "storages.backends.s3boto3.S3Boto3Storage"
    AWS_ACCESS_KEY_ID = config("SPACES_ACCESS_KEY")
    AWS_SECRET_ACCESS_KEY = config("SPACES_SECRET_KEY")
    AWS_STORAGE_BUCKET_NAME = config("SPACES_BUCKET_NAME")
    AWS_S3_ENDPOINT_URL = config("SPACES_ENDPOINT_URL")
    AWS_S3_REGION_NAME = config("SPACES_REGION", default="blr1")
    AWS_DEFAULT_ACL = "private"
    AWS_S3_FILE_OVERWRITE = False
    AWS_QUERYSTRING_AUTH = True
    AWS_QUERYSTRING_EXPIRE = 3600  # signed URLs valid for 1 hour

# ---------------------------------------------------------------------------
# Email (AWS SES via anymail)
# ---------------------------------------------------------------------------
ANYMAIL = {
    "AMAZON_SES_CLIENT_PARAMS": {
        "region_name": config("AWS_SES_REGION", default="ap-south-1"),
    },
}
EMAIL_BACKEND = config(
    "EMAIL_BACKEND",
    default="django.core.mail.backends.console.EmailBackend",
)
DEFAULT_FROM_EMAIL = config("DEFAULT_FROM_EMAIL", default="noreply@yourbrand.com")
SERVER_EMAIL = DEFAULT_FROM_EMAIL

# ---------------------------------------------------------------------------
# Encryption key (Fernet) for PII fields
# ---------------------------------------------------------------------------
FIELD_ENCRYPTION_KEY = config("FIELD_ENCRYPTION_KEY")

# ---------------------------------------------------------------------------
# Security
# ---------------------------------------------------------------------------
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"
CSRF_COOKIE_HTTPONLY = True

# HR is reached through the nginx front door (e.g. http://hr.localhost:8080), so
# form POSTs arrive with that Origin — it must be trusted for CSRF. Configurable
# per environment; dev defaults cover the front-door + workspace hosts.
CSRF_TRUSTED_ORIGINS = config(
    "CSRF_TRUSTED_ORIGINS",
    default="http://hr.localhost:8080,http://localhost:8080,http://*.localhost:8080",
    cast=Csv(),
)

# ---------------------------------------------------------------------------
# Sentry
# ---------------------------------------------------------------------------
SENTRY_DSN = config("SENTRY_DSN", default="")

# ---------------------------------------------------------------------------
# Application-level constants
# ---------------------------------------------------------------------------
HRMS_SUPERADMIN_DOMAIN = config("SUPERADMIN_DOMAIN", default="app.yourbrand.com")
HRMS_TENANT_DOMAIN = config("TENANT_DOMAIN", default="yourbrand.com")

# ---------------------------------------------------------------------------
# AI / LLM (Anthropic Claude)
# ---------------------------------------------------------------------------
ANTHROPIC_API_KEY = config("ANTHROPIC_API_KEY", default="")
ANTHROPIC_MODEL = config("ANTHROPIC_MODEL", default="claude-sonnet-4-6")
AI_FEATURES_ENABLED = bool(ANTHROPIC_API_KEY)

# ---------------------------------------------------------------------------
# SSO handoff from the FIN platform (shared secret with apps/finance backend).
# When set, /auth/sso/?token=... exchanges a FIN-minted token for an HR session
# so the embedded HR app doesn't ask the user to log in a second time.
# ---------------------------------------------------------------------------
SSO_SHARED_SECRET = config("SSO_SHARED_SECRET", default="")
SSO_TOKEN_MAX_AGE_SECONDS = config("SSO_TOKEN_MAX_AGE_SECONDS", default=120, cast=int)
