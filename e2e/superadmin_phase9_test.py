"""API test for Phase 9 (observability): health, activity union, payments, jobs."""
import json, subprocess, urllib.request, urllib.error

BASE = "http://localhost:8000/api/v1"
results = []
_SEED_TARGET = "phase9-seed-target"


def _shell(code):
    subprocess.run(
        ["docker", "exec", "sapttafimhr-fin-backend-1", "python", "manage.py", "shell", "-c", code],
        capture_output=True,
    )


def seed_core_audit():
    """Seed a core.AuditLog row so the union test has a 'system' source to find."""
    _shell(f"from apps.core.models import AuditLog; AuditLog.record(actor_email='system:test', action='subscription.auto_cancel', target='{_SEED_TARGET}')")


def clean_core_audit():
    _shell(f"from apps.core.models import AuditLog; AuditLog.objects.filter(target='{_SEED_TARGET}').delete()")


def clean_orphan_user(email):
    """A provisioned user survives company deletion (public schema). Remove it."""
    _shell(
        "from django.db import connection\n"
        "with connection.cursor() as c:\n"
        f"    c.execute(\"DELETE FROM identity_user WHERE email = '{email}'\")"
    )

def call(method, path, token=None, body=None):
    url = BASE + path
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", "Bearer " + token)
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, json.loads(r.read().decode() or "{}")
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode() or "{}")

def check(name, cond, extra=""):
    results.append((name, cond))
    print(("PASS" if cond else "FAIL"), "-", name, ("" if cond else f" :: {extra}"))

seed_core_audit()  # ensure a 'system' (core.AuditLog) row exists for the union check

st, d = call("POST", "/auth/login/", body={"email": "sp@saptta.com", "password": "Saptta@2026"})
token = d.get("access")
check("login", st == 200 and bool(token), str(st))

# Provision a temp company → writes a SaasAuditLog (console) row.
st, d = call("POST", "/saas/admin/companies/new/", token,
             {"company_name": "QA9 Observability Co", "email": "qa9@example.test", "products": ["finance"]})
schema = d.get("schema_name")
check("provision temp company", st == 201 and bool(schema), str(d))

# Generate an OPEN invoice so the payments log has data.
st, inv = call("POST", f"/saas/admin/companies/{schema}/invoices/", token, {"amount": 1180})
check("generate invoice", st == 201 and inv.get("status") == "OPEN", str(inv))

# 9c — health
st, h = call("GET", "/saas/admin/health/?hr_rollup=1", token)
svc = h.get("services", {})
check("health overall present", st == 200 and h.get("overall") in ("up", "degraded"), str(st))
check("health has postgres up", svc.get("postgres", {}).get("status") == "up", str(svc.get("postgres")))
check("health has all 5 services", set(svc) == {"postgres", "redis", "celery_worker", "fin_backend", "hr_backend"}, str(set(svc)))
check("health hr_headcount present", "hr_headcount" in h, str(list(h)))

# 9a — activity union (console from provision + system from seeded core.AuditLog)
st, a = call("GET", "/saas/admin/activity/?limit=300", token)
sources = {r["source"] for r in a.get("results", [])}
actions = {r["action"] for r in a.get("results", [])}
check("activity returns rows", st == 200 and a.get("count", 0) > 0, str(st))
check("activity has console source", "console" in sources, str(sources))
check("activity has system source (core.AuditLog)", "system" in sources, str(sources))
check("activity includes company.provision", "company.provision" in actions, str(list(actions)[:10]))

# 9a — filter by schema
st, a2 = call("GET", f"/saas/admin/activity/?schema={schema}", token)
check("activity filter by schema", st == 200 and all(r["target"] == schema for r in a2.get("results", []) if r["source"] == "console"), str(st))

# 9b — payments log
st, p = call("GET", "/saas/admin/payments/", token)
nums = {i["number"] for i in p.get("invoices", [])}
check("payments lists our invoice", st == 200 and inv.get("number") in nums, str(nums))
check("payments summary open>=1", p.get("summary", {}).get("open", 0) >= 1, str(p.get("summary")))

# 9d — jobs status + run-now
st, j = call("GET", "/saas/admin/jobs/", token)
check("jobs schedule listed", st == 200 and len(j.get("jobs", [])) > 0, str(st))
check("jobs candidates present", "active_lapsed" in j.get("candidates", {}), str(j.get("candidates")))
st, r = call("POST", "/saas/admin/jobs/", token, {"task": "expire_overdue_subscriptions"})
check("run dunning job", st == 200 and "changed" in r, str(r))
st, r2 = call("POST", "/saas/admin/jobs/", token, {"task": "bogus"})
check("reject unknown job", st == 400, str(st))

# job.run wrote an audit row
st, a3 = call("GET", "/saas/admin/activity/?action=job.run", token)
check("job.run audited", st == 200 and any(x["action"] == "job.run" for x in a3.get("results", [])), str(st))

# Cleanup the temp company
st, _ = call("DELETE", f"/saas/admin/companies/{schema}/lifecycle/?confirm={schema}", token)
check("cleanup temp company", st == 200, str(st))

clean_core_audit()  # remove the seeded precondition row
clean_orphan_user("qa9@example.test")  # provisioned user outlives company deletion

print("\n=== SUMMARY ===")
passed = sum(1 for _, c in results if c)
print(f"{passed}/{len(results)} checks passed")
exit(0 if passed == len(results) else 1)
