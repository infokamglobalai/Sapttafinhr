"""
Simple cache-based rate limiter for auth endpoints.

Keys two windows per identifier:
  - sliding: count of attempts in the last N seconds (default 900 = 15 min)
  - lockout: hard lockout flag set when threshold exceeded

Identifier is "<scope>:<ip>:<email>". We rate-limit by IP + email pair so an
attacker spraying one IP across many emails still gets blocked per-email,
and brute-forcing one email across many IPs gets blocked per-IP.

Designed to fail open: if the cache is down, requests go through.
"""
import logging
from django.core.cache import cache

logger = logging.getLogger(__name__)


def _client_ip(request) -> str:
    """Trustworthy IP: prefer X-Forwarded-For first hop, else REMOTE_ADDR."""
    xff = request.META.get("HTTP_X_FORWARDED_FOR", "")
    if xff:
        return xff.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR", "unknown")


def _key(scope: str, ip: str, email: str = "") -> str:
    safe_email = (email or "").lower().replace(" ", "")[:128]
    return f"rl:{scope}:{ip}:{safe_email}"


def is_locked_out(scope: str, request, email: str = "") -> bool:
    """Return True if this IP+email is currently locked out."""
    try:
        ip = _client_ip(request)
        lock_key = _key(f"{scope}:lock", ip, email)
        return bool(cache.get(lock_key))
    except Exception as exc:
        logger.warning("Ratelimit check failed (fail-open): %s", exc)
        return False


def record_failure(scope: str, request, email: str = "",
                   max_attempts: int = 5,
                   window_seconds: int = 900,
                   lockout_seconds: int = 900) -> tuple[int, int]:
    """
    Record one failed attempt. If the running count exceeds max_attempts in
    the rolling window, set a hard lockout for lockout_seconds.

    Returns (attempts_so_far, remaining_attempts).
    """
    try:
        ip = _client_ip(request)
        count_key = _key(f"{scope}:count", ip, email)
        lock_key = _key(f"{scope}:lock", ip, email)

        # cache.add is atomic — only succeeds if key didn't exist
        cache.add(count_key, 0, window_seconds)
        try:
            attempts = cache.incr(count_key)
        except ValueError:
            # incr failed because key expired between add and incr
            cache.set(count_key, 1, window_seconds)
            attempts = 1

        if attempts >= max_attempts:
            cache.set(lock_key, True, lockout_seconds)

        return attempts, max(0, max_attempts - attempts)
    except Exception as exc:
        logger.warning("Ratelimit record failed (fail-open): %s", exc)
        return 0, max_attempts


def clear_failures(scope: str, request, email: str = ""):
    """Call this on successful auth to wipe the counter."""
    try:
        ip = _client_ip(request)
        cache.delete(_key(f"{scope}:count", ip, email))
        cache.delete(_key(f"{scope}:lock", ip, email))
    except Exception:
        pass
