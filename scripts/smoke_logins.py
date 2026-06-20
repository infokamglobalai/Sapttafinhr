#!/usr/bin/env python3
"""Smoke-test all Saptta login paths (run inside fin-backend or with network to :8080)."""
from __future__ import annotations

import os
import sys

import requests

BASE = os.environ.get("SMOKE_BASE_URL", "http://nginx:80")
HR_HOST = os.environ.get("SMOKE_HR_HOST", "hr.localhost")
WORKSPACE = os.environ.get("SMOKE_WORKSPACE", "acme")

FAILURES = []


def check(name: str, ok: bool, detail: str = "") -> None:
    status = "OK" if ok else "FAIL"
    line = f"{status}  {name}" + (f" — {detail}" if detail else "")
    print(line)
    if not ok:
        FAILURES.append(name)


def main() -> int:
    session = requests.Session()
    session.headers.update({"Accept": "application/json"})

    # 1. Platform owner (FIN JWT)
    owner_email = os.environ.get("SMOKE_OWNER_EMAIL", "demo@saptta.com")
    owner_pass = os.environ.get("SMOKE_OWNER_PASSWORD", "Demo@1234")
    r = session.post(
        f"{BASE}/api/v1/auth/login/",
        json={"email": owner_email, "password": owner_pass},
        timeout=20,
    )
    owner_token = None
    if r.status_code == 200 and r.json().get("access"):
        owner_token = r.json()["access"]
        check("Platform owner login (FIN JWT)", True, owner_email)
    else:
        # Fallback bootstrap user
        r2 = session.post(
            f"{BASE}/api/v1/auth/login/",
            json={"email": "admin@acme.test", "password": "admin12345"},
            timeout=20,
        )
        if r2.status_code == 200 and r2.json().get("access"):
            owner_token = r2.json()["access"]
            check("Platform owner login (FIN JWT)", True, "admin@acme.test")
        else:
            check("Platform owner login (FIN JWT)", False, f"HTTP {r.status_code}")

    # 2. HR staff via unified platform API
    for email, password, label in (
        ("employee@saptta.local", "Employee@1234", "employee"),
        ("manager@saptta.local", "Manager@1234", "team lead / manager"),
    ):
        r = session.post(
            f"{BASE}/api/v1/auth/hr-staff-login/",
            json={
                "email": email,
                "password": password,
                "workspace": WORKSPACE,
                "platform_url": "http://localhost:8080",
            },
            timeout=20,
        )
        ok = r.status_code == 200 and bool(r.json().get("redirect_url"))
        check(f"Unified login → HR SSO ({label})", ok, f"HTTP {r.status_code}")

    # 3. HR SSO mint + exchange (owner)
    if owner_token:
        r = session.post(
            f"{BASE}/api/v1/auth/hr-sso-token/",
            json={"workspace": WORKSPACE},
            headers={"Authorization": f"Bearer {owner_token}"},
            timeout=20,
        )
        if r.status_code == 200 and r.json().get("token"):
            token = r.json()["token"]
            check("HR SSO token mint", True)
            h = requests.get(
                f"{BASE}/auth/sso/",
                params={"token": token, "next": "/"},
                headers={"Host": HR_HOST},
                allow_redirects=False,
                timeout=20,
            )
            check("HR SSO session exchange", h.status_code in (302, 303), f"HTTP {h.status_code}")
        else:
            check("HR SSO token mint", False, f"HTTP {r.status_code}")
    else:
        check("HR SSO token mint", False, "skipped — no owner token")

    # 4. HR employee-login page + POST login
    page = session.get(
        f"{BASE}/auth/employee-login/",
        headers={"Host": HR_HOST},
        timeout=20,
    )
    check("HR employee-login page", page.status_code == 200)

    csrf = session.cookies.get("csrftoken")
    if not csrf:
        import re

        m = re.search(r'name="csrfmiddlewaretoken"\s+value="([^"]+)"', page.text)
        csrf = m.group(1) if m else ""
    login_resp = session.post(
        f"{BASE}/auth/employee-login/",
        headers={
            "Host": HR_HOST,
            "Referer": f"http://{HR_HOST}/auth/employee-login/",
            "Origin": f"http://{HR_HOST}",
        },
        data={
            "csrfmiddlewaretoken": csrf,
            "email": "employee@saptta.local",
            "password": "Employee@1234",
        },
        allow_redirects=False,
        timeout=20,
    )
    check(
        "HR native employee POST login",
        login_resp.status_code in (302, 303) and "sessionid" in session.cookies,
        f"HTTP {login_resp.status_code}",
    )

    # 5. HR /auth/login/ redirects to platform
    redir = requests.get(
        f"{BASE}/auth/login/",
        headers={"Host": HR_HOST},
        allow_redirects=False,
        timeout=20,
    )
    loc = redir.headers.get("Location", "")
    check(
        "HR /auth/login/ → platform redirect",
        redir.status_code in (302, 303) and "login" in loc.lower(),
        loc[:80],
    )

    print()
    if FAILURES:
        print(f"FAILED ({len(FAILURES)}): {', '.join(FAILURES)}")
        return 1
    print("All login smoke checks passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
