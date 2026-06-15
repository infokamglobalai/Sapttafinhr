"""Outbound-request safety (SSRF guard).

Tenant admins can configure webhook URLs (publicapi WebhookSubscription, automation
rules). Without validation, those URLs can target the cloud metadata endpoint
(169.254.169.254), localhost, or internal service DNS (db, redis, hr-backend) —
classic SSRF, since the request fires from inside the trusted network.

`validate_outbound_url` resolves the host and rejects any address that lands in a
private / loopback / link-local / reserved range, plus non-http(s) schemes. It
resolves every A/AAAA record so a hostname that points at an internal IP can't
sneak through.

Enforcement is on by default in production and lenient in DEBUG (so local
webhook testing against localhost still works); override with
ALLOW_PRIVATE_OUTBOUND_URLS.
"""
from __future__ import annotations

import ipaddress
import socket
from urllib.parse import urlparse

from django.conf import settings


class UnsafeURLError(ValueError):
    """Raised when a URL is not safe to fetch (SSRF guard)."""


def _allow_private() -> bool:
    return bool(getattr(settings, "ALLOW_PRIVATE_OUTBOUND_URLS", settings.DEBUG))


def _is_blocked_ip(ip: str) -> bool:
    addr = ipaddress.ip_address(ip)
    return (
        addr.is_private
        or addr.is_loopback
        or addr.is_link_local      # blocks 169.254.169.254 cloud metadata
        or addr.is_reserved
        or addr.is_multicast
        or addr.is_unspecified
    )


def validate_outbound_url(url: str, *, allowed_schemes: tuple[str, ...] = ("http", "https")) -> str:
    """Return `url` if safe to fetch, else raise UnsafeURLError.

    Disabled (returns url unchanged) when private hosts are allowed — see module
    docstring. Callers should treat UnsafeURLError as "do not send".
    """
    if _allow_private():
        return url

    parsed = urlparse(url)
    if parsed.scheme not in allowed_schemes:
        raise UnsafeURLError(f"scheme '{parsed.scheme}' not allowed")

    host = parsed.hostname
    if not host:
        raise UnsafeURLError("missing host")

    port = parsed.port or (443 if parsed.scheme == "https" else 80)
    try:
        infos = socket.getaddrinfo(host, port, proto=socket.IPPROTO_TCP)
    except socket.gaierror as exc:
        raise UnsafeURLError(f"could not resolve host '{host}'") from exc

    for info in infos:
        ip = info[4][0]
        if _is_blocked_ip(ip):
            raise UnsafeURLError(f"host '{host}' resolves to blocked address {ip}")

    return url
