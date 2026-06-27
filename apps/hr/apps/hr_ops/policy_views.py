"""HR policy document management."""
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.http import FileResponse, Http404
from django.shortcuts import get_object_or_404, redirect, render
from django.utils import timezone
from django.views.decorators.http import require_POST

from apps.employees.models import Department, Employee
from utils.access import perm_required

from .models import PolicyDocument, PolicyRecipient
from . import policy_services as ps


@login_required
@perm_required("hr_ops.generate_letters")
def policy_list(request):
    docs = PolicyDocument.objects.filter(tenant=request.tenant).order_by("-updated_at")
    policy_rows = []
    for doc in docs:
        summary = ps.get_compliance_summary(doc)
        policy_rows.append({"policy": doc, "compliance": summary})
    return render(request, "hr_ops/policy_list.html", {"policy_rows": policy_rows})


@login_required
@perm_required("hr_ops.generate_letters")
def policy_create_or_edit(request, pk=None):
    tenant = request.tenant
    policy = get_object_or_404(PolicyDocument, pk=pk, tenant=tenant) if pk else None
    versions = policy.versions.all()[:10] if policy else []

    if request.method == "POST":
        title = request.POST.get("title", "").strip()
        body = request.POST.get("body", "").strip()
        category = request.POST.get("category", "").strip()
        is_active = request.POST.get("is_active") == "on"
        change_notes = request.POST.get("change_notes", "").strip()
        upload = request.FILES.get("attachment")

        if not title:
            messages.error(request, "Title is required.")
        elif not body and not upload and not (policy and policy.attachment):
            messages.error(request, "Add policy text or upload a PDF/DOCX document.")
        else:
            if policy:
                bumped = False
                if ps.content_changed(policy, title=title, body=body, category=category, new_upload=upload):
                    if not change_notes:
                        messages.error(request, "Describe what changed — this creates a new version (e.g. v2).")
                    else:
                        ps.bump_policy_version(policy, changed_by=request.user, change_notes=change_notes)
                        bumped = True
                policy.title = title
                policy.body = body
                policy.category = category
                policy.is_active = is_active
                if upload:
                    policy.attachment = upload
                    extracted = ps.extract_policy_text(upload.read(), upload.name)
                    if extracted:
                        policy.body = extracted
                    upload.seek(0)
                policy.save()
                if bumped:
                    messages.success(request, f"Policy updated to v{policy.version_number}. Send it to employees when ready.")
                else:
                    messages.success(request, "Policy updated.")
                return redirect("hr_ops:policy_distribute", pk=policy.pk)
            else:
                extracted = ""
                if upload:
                    extracted = ps.extract_policy_text(upload.read(), upload.name)
                    upload.seek(0)
                policy = PolicyDocument.objects.create(
                    tenant=tenant,
                    title=title,
                    body=extracted or body,
                    category=category,
                    is_active=is_active,
                    created_by=request.user,
                    attachment=upload if upload else None,
                )
                messages.success(request, "Policy saved (v1). Choose who should receive it.")
                return redirect("hr_ops:policy_distribute", pk=policy.pk)

    return render(request, "hr_ops/policy_form.html", {"policy": policy, "versions": versions})


@login_required
@perm_required("hr_ops.generate_letters")
def policy_distribute(request, pk):
    policy = get_object_or_404(PolicyDocument, pk=pk, tenant=request.tenant)
    departments = Department.objects.filter(tenant=request.tenant, is_active=True).order_by("name")
    employees = Employee.objects.filter(
        tenant=request.tenant, is_active=True, employment_status="active"
    ).order_by("first_name", "last_name")
    compliance = ps.get_compliance_summary(policy)

    if request.method == "POST":
        audience = request.POST.get("audience", "company")
        dept_ids = [int(x) for x in request.POST.getlist("departments") if x.isdigit()]
        emp_ids = [int(x) for x in request.POST.getlist("employees") if x.isdigit()]
        requires_ack = request.POST.get("requires_acknowledgment") == "on"
        try:
            if audience == "departments" and not dept_ids:
                raise ValueError("Select at least one department.")
            if audience == "employees" and not emp_ids:
                raise ValueError("Select at least one employee.")
            dist, count = ps.distribute_policy(
                policy,
                audience=audience,
                distributed_by=request.user,
                department_ids=dept_ids or None,
                employee_ids=emp_ids or None,
                requires_acknowledgment=requires_ack,
            )
            messages.success(request, f"Policy v{policy.version_number} sent to {count} employee(s).")
            return redirect("hr_ops:policy_compliance", pk=policy.pk)
        except ValueError as exc:
            messages.error(request, str(exc))

    return render(request, "hr_ops/policy_distribute.html", {
        "policy": policy,
        "departments": departments,
        "employees": employees,
        "compliance": compliance,
        "distributions": policy.distributions.select_related("distributed_by")[:5],
    })


@login_required
@perm_required("hr_ops.generate_letters")
def policy_compliance(request, pk):
    policy = get_object_or_404(PolicyDocument, pk=pk, tenant=request.tenant)
    recipients = ps.get_current_version_recipients(policy)
    summary = ps.get_compliance_summary(policy)
    versions = policy.versions.all()[:20]
    return render(request, "hr_ops/policy_compliance.html", {
        "policy": policy,
        "recipients": recipients,
        "summary": summary,
        "versions": versions,
    })


@login_required
@perm_required("hr_ops.generate_letters")
@require_POST
def policy_remind(request, pk):
    policy = get_object_or_404(PolicyDocument, pk=pk, tenant=request.tenant)
    count = ps.remind_pending_recipients(policy, reminded_by=request.user)
    if count:
        messages.success(request, f"Reminder sent to {count} employee(s).")
    else:
        messages.info(request, "Everyone has already acknowledged this version.")
    return redirect("hr_ops:policy_compliance", pk=policy.pk)


@login_required
def policy_download(request, pk):
    policy = get_object_or_404(PolicyDocument, pk=pk, tenant=request.tenant)
    if not policy.attachment:
        raise Http404
    if not request.user.is_hr_admin and not request.user.has_perm_code("hr_ops.generate_letters"):
        allowed = PolicyRecipient.objects.filter(
            user=request.user,
            distribution__policy=policy,
        ).exists()
        if not allowed:
            raise Http404
    return FileResponse(policy.attachment.open("rb"), as_attachment=False, filename=policy.attachment.name.split("/")[-1])


def _latest_receipt(user, policy):
    return (
        PolicyRecipient.objects.filter(
            user=user,
            distribution__policy=policy,
            distribution__version_number=policy.version_number,
        )
        .select_related("distribution")
        .order_by("-distribution__distributed_at")
        .first()
    )


@login_required
def employee_policy_list(request):
    employee = getattr(request.user, "employee_profile", None)
    if not employee:
        return redirect("tenants:dashboard")

    policy_ids = (
        PolicyRecipient.objects.filter(user=request.user)
        .values_list("distribution__policy_id", flat=True)
        .distinct()
    )
    policies = PolicyDocument.objects.filter(
        tenant=request.tenant, pk__in=policy_ids, is_active=True
    ).order_by("-last_distributed_at", "title")

    rows = []
    for p in policies:
        receipt = _latest_receipt(request.user, p)
        needs_ack = (
            receipt
            and receipt.distribution.requires_acknowledgment
            and not receipt.acknowledged_at
        )
        rows.append({"policy": p, "receipt": receipt, "needs_ack": needs_ack})

    return render(request, "hr_ops/employee_policies.html", {"policy_rows": rows})


@login_required
def employee_policy_view(request, pk):
    policy = get_object_or_404(PolicyDocument, pk=pk, tenant=request.tenant, is_active=True)
    receipt = _latest_receipt(request.user, policy)
    if not receipt and not (request.user.is_hr_admin or request.user.has_perm_code("hr_ops.generate_letters")):
        raise Http404

    if request.method == "POST" and request.POST.get("action") == "acknowledge":
        if not request.POST.get("confirm"):
            messages.error(request, "Please check the box to confirm you have read and agree.")
        elif receipt and receipt.distribution.requires_acknowledgment and not receipt.acknowledged_at:
            ps.acknowledge_policy(receipt)
            messages.success(request, "Thank you — your acknowledgment has been recorded.")
            return redirect("hr_ops:employee_policy_view", pk=pk)
        else:
            messages.info(request, "Already acknowledged.")

    if receipt and not receipt.read_at:
        receipt.read_at = timezone.now()
        receipt.save(update_fields=["read_at"])

    needs_ack = (
        receipt
        and receipt.distribution.requires_acknowledgment
        and not receipt.acknowledged_at
    )
    return render(request, "hr_ops/employee_policy_detail.html", {
        "policy": policy,
        "receipt": receipt,
        "needs_ack": needs_ack,
    })


@login_required
@perm_required("hr_ops.generate_letters")
@require_POST
def policy_delete(request, pk):
    policy = get_object_or_404(PolicyDocument, pk=pk, tenant=request.tenant)
    policy.delete()
    messages.success(request, "Policy deleted.")
    return redirect("hr_ops:policy_list")
