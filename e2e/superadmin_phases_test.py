"""End-to-end API test for all 6 super-admin phases against the running stack."""
import json, subprocess, urllib.request, urllib.error

BASE = "http://localhost:8000/api/v1"
results = []

def call(method, path, token=None, body=None, ok=(200, 201)):
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

# ── auth ──
st, d = call("POST", "/auth/login/", body={"email": "sp@saptta.com", "password": "Saptta@2026"})
token = d.get("access")
check("superadmin login", st == 200 and bool(token), f"{st} {d}")

# ── Phase 4: provision ──
st, d = call("POST", "/saas/admin/companies/new/", token, {
    "company_name": "QA Phase Test Co", "email": "qa-phase@example.test",
    "products": ["finance", "hrms"], "plan_id": "saptta-complete", "country": "IN",
})
schema = d.get("schema_name")
check("Phase4 provision company", st == 201 and bool(schema), f"{st} {d}")
check("Phase4 provision returns reset_link", bool(d.get("reset_link")), str(d))

# ── Phase 1: drill-down ──
st, detail = call("GET", f"/saas/admin/companies/{schema}/", token)
check("Phase1 company detail", st == 200 and detail.get("name") == "QA Phase Test Co", f"{st}")
check("Phase1 detail has subscription", bool(detail.get("subscription")), str(detail.get("subscription")))
check("Phase1 detail has owner user", len(detail.get("users", [])) >= 1, str(detail.get("users")))
sub_id = detail["subscription"]["id"]

# ── Phase 2: user management ──
st, u = call("POST", f"/saas/admin/companies/{schema}/users/", token,
             {"email": "qa-extra@example.test", "full_name": "QA Extra"})
uid = u.get("id")
check("Phase2 create user", st == 201 and bool(uid), f"{st} {u}")
check("Phase2 new user reset_link", bool(u.get("reset_link")), str(u))
st, r = call("POST", f"/saas/admin/users/{uid}/reset-password/", token)
check("Phase2 reset password", st == 200 and bool(r.get("reset_link")), f"{st} {r}")
st, r = call("POST", f"/saas/admin/users/{uid}/set-active/", token, {"is_active": False})
check("Phase2 deactivate user", st == 200 and r.get("is_active") is False, f"{st} {r}")

# ── Phase 5: billing ops ──
st, inv = call("POST", f"/saas/admin/companies/{schema}/invoices/", token, {"amount": 1180})
check("Phase5 generate invoice", st == 201 and inv.get("status") == "OPEN", f"{st} {inv}")
inv_id = inv.get("id")
st, r = call("POST", f"/saas/admin/invoices/{inv_id}/mark-paid/", token)
check("Phase5 mark invoice paid", st == 200 and r.get("status") == "PAID", f"{st} {r}")
st, r = call("POST", f"/saas/admin/subscriptions/{sub_id}/entitlement/", token,
             {"product": "HR", "enable": False})
check("Phase5 toggle entitlement off", st == 200 and r.get("status") == "SUSPENDED", f"{st} {r}")
# plan CRUD
st, p = call("POST", "/saas/admin/plans/", token,
             {"code": "qa-test-plan", "name": "QA Test Plan", "monthly_price": 999})
pid = p.get("id")
check("Phase5 create plan", st == 201 and bool(pid), f"{st} {p}")
st, p = call("PATCH", f"/saas/admin/plans/{pid}/", token, {"monthly_price": 1499})
check("Phase5 update plan", st == 200 and str(p.get("monthly_price")) in ("1499.00", "1499"), f"{st} {p}")
st, _ = call("DELETE", f"/saas/admin/plans/{pid}/", token, ok=(200, 204))
check("Phase5 delete plan", st in (200, 204), f"{st}")

# ── Phase 3: impersonation ──
st, imp = call("POST", f"/saas/admin/companies/{schema}/impersonate/", token)
check("Phase3 impersonate", st == 200 and bool(imp.get("access")) and imp.get("company") == "QA Phase Test Co", f"{st} {imp}")
# the impersonation token should work as a tenant token
imp_token = imp.get("access")
st, me = call("GET", "/auth/me/", imp_token)
check("Phase3 impersonation token valid", st == 200 and me.get("email") == "qa-phase@example.test", f"{st} {me}")

# ── Phase 6: analytics ──
st, an = call("GET", "/saas/admin/analytics/", token)
check("Phase6 analytics", st == 200 and "signups_by_month" in an and "status_mix" in an, f"{st}")
check("Phase6 analytics has plan_mix", isinstance(an.get("plan_mix"), list), str(an.get("plan_mix")))

# ── Phase 1: audit trail captured everything ──
st, audit = call("GET", f"/saas/admin/audit/?schema={schema}", token)
actions = {a["action"] for a in audit}
check("Phase1 audit recorded actions", st == 200 and {"company.provision", "user.create", "invoice.generate", "impersonate"} <= actions,
      f"{st} got={actions}")

# ── Phase 4: lifecycle archive + delete (cleanup) ──
st, r = call("POST", f"/saas/admin/companies/{schema}/lifecycle/", token, {"active": False})
check("Phase4 archive company", st == 200 and r.get("is_active") is False, f"{st} {r}")
# delete without confirm should fail
st, r = call("DELETE", f"/saas/admin/companies/{schema}/lifecycle/", token, ok=(400,))
check("Phase4 delete blocked without confirm", st == 400, f"{st} {r}")
# delete with confirm (cleanup)
st, r = call("DELETE", f"/saas/admin/companies/{schema}/lifecycle/?confirm={schema}", token, ok=(200,))
check("Phase4 delete company (cleanup)", st == 200 and r.get("deleted") == schema, f"{st} {r}")
# verify gone
st, _ = call("GET", f"/saas/admin/companies/{schema}/", token, ok=(404,))
check("Phase4 company removed", st == 404, f"{st}")

# Provisioned/created users survive company deletion (public schema). Clean them
# so the suite is idempotent across runs (a 2nd run would otherwise 409 on provision).
subprocess.run(
    ["docker", "exec", "sapttafimhr-fin-backend-1", "python", "manage.py", "shell", "-c",
     "from django.db import connection\n"
     "with connection.cursor() as c:\n"
     "    c.execute(\"DELETE FROM identity_user WHERE email IN ('qa-phase@example.test','qa-extra@example.test')\")"],
    capture_output=True,
)

print("\n=== SUMMARY ===")
passed = sum(1 for _, c in results if c)
print(f"{passed}/{len(results)} checks passed")
exit(0 if passed == len(results) else 1)
