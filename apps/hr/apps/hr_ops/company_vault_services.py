"""Company document vault — access requests, grants, expiry."""
from __future__ import annotations

from datetime import timedelta

from django.utils import timezone

from .models import CompanyDocument, CompanyDocumentAccessRequest
from .services import audit_log, notify


DEFAULT_ACCESS_DAYS = 7


def expire_stale_grants(tenant=None):
    """Mark approved requests past access_expires_at as expired."""
    qs = CompanyDocumentAccessRequest.objects.filter(
        status="approved",
        access_expires_at__lt=timezone.now(),
    )
    if tenant:
        qs = qs.filter(tenant=tenant)
    return qs.update(status="expired", updated_at=timezone.now())


def submit_access_request(tenant, employee, *, doc_type: str, purpose: str) -> CompanyDocumentAccessRequest:
    purpose = (purpose or "").strip()
    if not purpose:
        raise ValueError("Please describe why you need this document.")

    pending = CompanyDocumentAccessRequest.objects.filter(
        tenant=tenant,
        employee=employee,
        doc_type=doc_type,
        status="pending",
    ).exists()
    if pending:
        raise ValueError("You already have a pending request for this document type.")

    req = CompanyDocumentAccessRequest.objects.create(
        tenant=tenant,
        employee=employee,
        doc_type=doc_type,
        purpose=purpose,
    )
    _notify_vault_admins(tenant, req)
    return req


def approve_access_request(
    req: CompanyDocumentAccessRequest,
    reviewer,
    document: CompanyDocument,
    *,
    access_days: int = DEFAULT_ACCESS_DAYS,
    ip=None,
) -> CompanyDocumentAccessRequest:
    if req.status != "pending":
        raise ValueError("Only pending requests can be approved.")
    if document.tenant_id != req.tenant_id or not document.is_active:
        raise ValueError("Invalid document selected.")
    if document.doc_type != req.doc_type:
        raise ValueError("Selected document type does not match the request.")

    req.document = document
    req.status = "approved"
    req.reviewed_by = reviewer
    req.reviewed_at = timezone.now()
    req.access_expires_at = timezone.now() + timedelta(days=max(1, access_days))
    req.denial_reason = ""
    req.save()

    audit_log(
        req.tenant,
        reviewer,
        "approve",
        "CompanyDocumentAccessRequest",
        req,
        f"Granted {document.title} to {req.employee.full_name}",
        ip_address=ip,
    )

    user = req.employee.user_id and req.employee.user
    if user:
        notify(
            user,
            "general",
            "Company document access approved",
            f"You may download {document.title} until {req.access_expires_at:%d %b %Y}.",
            action_url=f"/hr/vault/my-requests/{req.pk}/",
        )
    return req


def deny_access_request(
    req: CompanyDocumentAccessRequest,
    reviewer,
    reason: str = "",
    *,
    ip=None,
) -> CompanyDocumentAccessRequest:
    if req.status != "pending":
        raise ValueError("Only pending requests can be denied.")

    req.status = "denied"
    req.reviewed_by = reviewer
    req.reviewed_at = timezone.now()
    req.denial_reason = (reason or "").strip() or "Request denied."
    req.save()

    audit_log(
        req.tenant,
        reviewer,
        "reject",
        "CompanyDocumentAccessRequest",
        req,
        f"Denied company doc request for {req.employee.full_name}",
        {"reason": req.denial_reason},
        ip_address=ip,
    )

    user = req.employee.user_id and req.employee.user
    if user:
        notify(
            user,
            "general",
            "Company document request denied",
            req.denial_reason,
            action_url=f"/hr/vault/my-requests/{req.pk}/",
        )
    return req


def employee_can_download(user, document: CompanyDocument) -> bool:
    from utils.access import can_manage_company_vault

    if can_manage_company_vault(user):
        return True
    employee = getattr(user, "employee_profile", None)
    if not employee:
        return False
    expire_stale_grants(document.tenant)
    return CompanyDocumentAccessRequest.objects.filter(
        tenant=document.tenant,
        employee=employee,
        document=document,
        status="approved",
        access_expires_at__gt=timezone.now(),
    ).exists()


def _notify_vault_admins(tenant, req: CompanyDocumentAccessRequest):
    from apps.accounts.models import User

    from utils.access import can_manage_company_vault

    admins = User.objects.filter(tenant=tenant, is_active=True).select_related("employee_profile")
    for admin in admins:
        if can_manage_company_vault(admin):
            notify(
                admin,
                "general",
                "Company document access request",
                f"{req.employee.full_name} requested {req.get_doc_type_display()}.",
                action_url=f"/hr/vault/requests/{req.pk}/",
            )
