from .base import *  # noqa: F401,F403

DEBUG = False

# TLS is terminated at nginx; trust its forwarded proto.
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_SSL_REDIRECT = env.bool("SECURE_SSL_REDIRECT", default=True)  # noqa: F405
SECURE_HSTS_SECONDS = 60 * 60 * 24 * 365
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SESSION_COOKIE_HTTPONLY = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"

# Trusted origins for CSRF on the HTTPS domains (Django 4+ needs scheme).
CSRF_TRUSTED_ORIGINS = env.list(  # noqa: F405
    "CSRF_TRUSTED_ORIGINS",
    default=["https://*.saptta.example.com"],
)

# Fail fast if a real secret wasn't provided in production.
if SECRET_KEY == "insecure-dev-key-change-me":  # noqa: F405
    raise RuntimeError("DJANGO_SECRET_KEY must be set to a strong value in production.")

# ===== Sentry — error tracking + performance monitoring =====
# Enabled only when SENTRY_DSN is set, so prod still boots without it.
SENTRY_DSN = env("SENTRY_DSN", default="")  # noqa: F405
if SENTRY_DSN:
    import sentry_sdk
    from sentry_sdk.integrations.celery import CeleryIntegration
    from sentry_sdk.integrations.django import DjangoIntegration
    from sentry_sdk.integrations.logging import LoggingIntegration
    from sentry_sdk.integrations.redis import RedisIntegration

    sentry_sdk.init(
        dsn=SENTRY_DSN,
        environment=env("SENTRY_ENVIRONMENT", default="production"),  # noqa: F405
        release=env("SENTRY_RELEASE", default=""),  # noqa: F405 — deploy sets git SHA
        integrations=[
            DjangoIntegration(),
            CeleryIntegration(),
            RedisIntegration(),
            LoggingIntegration(level=None, event_level="ERROR"),
        ],
        traces_sample_rate=env.float("SENTRY_TRACES_SAMPLE_RATE", default=0.05),  # noqa: F405
        profiles_sample_rate=env.float("SENTRY_PROFILES_SAMPLE_RATE", default=0.05),  # noqa: F405
        send_default_pii=False,  # don't ship request bodies / user PII to Sentry
    )
