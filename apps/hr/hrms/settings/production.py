from .base import *  # noqa
import logging
import sentry_sdk
from sentry_sdk.integrations.django import DjangoIntegration
from sentry_sdk.integrations.celery import CeleryIntegration
from sentry_sdk.integrations.logging import LoggingIntegration
from sentry_sdk.integrations.redis import RedisIntegration
from decouple import config

DEBUG = False

if SECRET_KEY in ("insecure-dev-hr-key-change-me", ""):  # noqa: F405
    raise RuntimeError("SECRET_KEY must be set to a strong value in production.")

# The FIN↔HR SSO secret must not be the forgeable dev value in production (empty
# is allowed — it just disables SSO). Keep in sync with FIN's prod guard.
if SSO_SHARED_SECRET == "dev-sso-shared-secret-change-me":  # noqa: F405
    raise RuntimeError("SSO_SHARED_SECRET must be a strong value in production (dev default detected).")

SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_SSL_REDIRECT = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

EMAIL_BACKEND = "anymail.backends.amazon_ses.EmailBackend"

# ---------------------------------------------------------------------------
# Sentry — error tracking + performance monitoring
# ---------------------------------------------------------------------------
SENTRY_ENVIRONMENT = config("SENTRY_ENVIRONMENT", default="production")
SENTRY_RELEASE = config("SENTRY_RELEASE", default="")  # set by deploy script, e.g. git SHA
SENTRY_TRACES_SAMPLE_RATE = config("SENTRY_TRACES_SAMPLE_RATE", default=0.05, cast=float)
SENTRY_PROFILES_SAMPLE_RATE = config("SENTRY_PROFILES_SAMPLE_RATE", default=0.05, cast=float)


def _sentry_before_send(event, hint):
    """Drop noisy / non-actionable events before they hit our quota."""
    # Drop disconnects and 404s — not actionable
    if "exc_info" in hint:
        exc_type, exc_value, _ = hint["exc_info"]
        ignored = (
            "Http404",
            "DisallowedHost",
            "BrokenPipeError",
            "ConnectionResetError",
            "PermissionDenied",
            "SuspiciousOperation",
        )
        if exc_type.__name__ in ignored:
            return None
    return event


if SENTRY_DSN:  # noqa
    sentry_sdk.init(
        dsn=SENTRY_DSN,  # noqa
        environment=SENTRY_ENVIRONMENT,
        release=SENTRY_RELEASE or None,
        integrations=[
            DjangoIntegration(
                transaction_style="url",
                middleware_spans=True,
                signals_spans=False,  # too noisy
                cache_spans=False,
            ),
            CeleryIntegration(monitor_beat_tasks=True),
            RedisIntegration(),
            LoggingIntegration(
                level=logging.INFO,        # breadcrumbs
                event_level=logging.ERROR,  # send-as-event
            ),
        ],
        traces_sample_rate=SENTRY_TRACES_SAMPLE_RATE,
        profiles_sample_rate=SENTRY_PROFILES_SAMPLE_RATE,
        send_default_pii=False,  # never send user emails / IPs by default
        attach_stacktrace=True,
        max_breadcrumbs=50,
        before_send=_sentry_before_send,
    )

# ---------------------------------------------------------------------------
# Logging — redirect error and request logs to stdout/stderr in production
# so they appear in docker logs.
# ---------------------------------------------------------------------------
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "{levelname} {asctime} {module} {process:d} {thread:d} {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "verbose",
        },
    },
    "loggers": {
        "django": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": True,
        },
        "django.request": {
            "handlers": ["console"],
            "level": "ERROR",
            "propagate": False,
        },
    },
}

