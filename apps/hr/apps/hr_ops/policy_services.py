"""Policy upload, text extraction, versioning, and audience distribution."""
from __future__ import annotations

import logging

from django.core.files.base import ContentFile
from django.db import transaction
from django.utils import timezone

logger = logging.getLogger(__name__)


def extract_policy_text(file_bytes: bytes, file_name: str) -> str:
    """Extract plain text from PDF/DOCX for AI search and preview."""
    try:
        from apps.recruitment.resume_parser import _extract_text
        return (_extract_text(file_bytes, file_name) or "").strip()
    except Exception as exc:
        logger.warning("Policy text extraction failed for %s: %s", file_name, exc)
        return ""


def resolve_policy_recipients(tenant, audience: str, department_ids=None, employee_ids=None):
    """Return active users who should receive a policy distribution."""
    from apps.employees.models import Employee

    qs = Employee.objects.filter(
        tenant=tenant, is_active=True, employment_status="active", user__isnull=False
    ).select_related("user")

    if audience == "departments" and department_ids:
        qs = qs.filter(department_id__in=department_ids)
    elif audience == "employees" and employee_ids:
        qs = qs.filter(pk__in=employee_ids)

    seen = set()
    recipients = []
    for emp in qs:
        if emp.user_id and emp.user_id not in seen:
            seen.add(emp.user_id)
            recipients.append(emp.user)
    return recipients


def _copy_attachment_field(source_file):
    """Duplicate uploaded file for version archive."""
    if not source_file:
        return None
    try:
        source_file.open("rb")
        data = source_file.read()
        source_file.close()
        name = source_file.name.split("/")[-1]
        return ContentFile(data, name=name)
    except Exception as exc:
        logger.warning("Could not copy policy attachment: %s", exc)
        return None


@transaction.atomic
def bump_policy_version(policy, *, changed_by, change_notes: str = ""):
    """Archive current content and increment version number."""
    from .models import PolicyVersion

    PolicyVersion.objects.create(
        policy=policy,
        version_number=policy.version_number,
        title=policy.title,
        body=policy.body,
        category=policy.category,
        attachment=_copy_attachment_field(policy.attachment),
        change_notes=change_notes.strip(),
        created_by=changed_by,
    )
    policy.version_number += 1
    policy.save(update_fields=["version_number", "updated_at"])
    return policy.version_number


def content_changed(policy, *, title, body, category, new_upload) -> bool:
    if policy.title != title or policy.body != body or policy.category != category:
        return True
    return bool(new_upload)


@transaction.atomic
def distribute_policy(
    policy,
    *,
    audience: str,
    distributed_by,
    department_ids=None,
    employee_ids=None,
    requires_acknowledgment: bool = True,
):
    """Notify selected employees about a policy (in-app + email)."""
    from .models import PolicyDistribution, PolicyRecipient
    from .services import notify

    recipients = resolve_policy_recipients(
        policy.tenant, audience, department_ids=department_ids, employee_ids=employee_ids
    )
    if not recipients:
        raise ValueError("No employees match the selected audience.")

    dist = PolicyDistribution.objects.create(
        tenant=policy.tenant,
        policy=policy,
        version_number=policy.version_number,
        requires_acknowledgment=requires_acknowledgment,
        audience=audience,
        distributed_by=distributed_by,
        recipient_count=len(recipients),
    )
    if audience == "departments" and department_ids:
        dist.departments.set(department_ids)
    if audience == "employees" and employee_ids:
        dist.employees.set(employee_ids)

    version_label = f"v{policy.version_number}"
    action_url = f"/hr/policies/view/{policy.pk}/"
    title = f"Policy update ({version_label}): {policy.title}"
    ack_line = " Please read and acknowledge it in your employee portal." if requires_acknowledgment else " Please review it in your employee portal."
    message = (
        f"{policy.tenant.name} has shared an HR policy update ({version_label})"
        f"{f' — {policy.category}' if policy.category else ''}."
        + ack_line
    )

    for user in recipients:
        PolicyRecipient.objects.create(distribution=dist, user=user)
        notify(
            user,
            "policy_published",
            title,
            message=message,
            action_url=action_url,
            send_email=True,
        )

    policy.last_distributed_at = timezone.now()
    policy.save(update_fields=["last_distributed_at", "updated_at"])
    return dist, len(recipients)


@transaction.atomic
def acknowledge_policy(receipt):
    """Record employee acknowledgment for a policy distribution."""
    if receipt.acknowledged_at:
        return receipt
    now = timezone.now()
    receipt.acknowledged_at = now
    if not receipt.read_at:
        receipt.read_at = now
    receipt.save(update_fields=["acknowledged_at", "read_at"])
    return receipt


def get_current_version_recipients(policy):
    """Recipients for the policy's current published version."""
    from .models import PolicyRecipient

    return (
        PolicyRecipient.objects.filter(
            distribution__policy=policy,
            distribution__version_number=policy.version_number,
        )
        .select_related("user", "user__employee_profile", "distribution")
        .order_by("user__employee_profile__first_name", "user__email")
    )


def get_compliance_summary(policy) -> dict:
    """Aggregate read/ack stats for the current policy version."""
    qs = get_current_version_recipients(policy)
    total = qs.count()
    read = qs.filter(read_at__isnull=False).count()
    acknowledged = qs.filter(acknowledged_at__isnull=False).count()
    pending = total - acknowledged
    return {
        "total": total,
        "read": read,
        "acknowledged": acknowledged,
        "pending": pending,
        "ack_pct": int(acknowledged / total * 100) if total else 0,
    }


@transaction.atomic
def remind_pending_recipients(policy, *, reminded_by, distribution_id=None):
    """Re-notify employees who have not acknowledged the current version."""
    from .services import notify

    qs = get_current_version_recipients(policy).filter(acknowledged_at__isnull=True)
    if distribution_id:
        qs = qs.filter(distribution_id=distribution_id)

    users = list(qs.select_related("user"))
    if not users:
        return 0

    version_label = f"v{policy.version_number}"
    action_url = f"/hr/policies/view/{policy.pk}/"
    title = f"Reminder: acknowledge {policy.title} ({version_label})"
    message = (
        f"This is a reminder to read and acknowledge the policy "
        f"'{policy.title}' ({version_label}). Open the link below to confirm."
    )
    now = timezone.now()
    count = 0
    for receipt in users:
        notify(
            receipt.user,
            "policy_published",
            title,
            message=message,
            action_url=action_url,
            send_email=True,
        )
        receipt.last_reminded_at = now
        receipt.save(update_fields=["last_reminded_at"])
        count += 1
    return count
