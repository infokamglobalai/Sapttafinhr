"""Company legal document vault — admin upload + employee access requests."""
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.http import FileResponse, Http404
from django.shortcuts import get_object_or_404, redirect, render
from django.utils import timezone
from django.views.decorators.http import require_POST

from utils.access import can_manage_company_vault, perm_required

from . import company_vault_services as vault
from .forms import CompanyDocAccessRequestForm, CompanyDocumentForm
from .models import CompanyDocument, CompanyDocumentAccessRequest
from .services import audit_log


def _client_ip(request):
    return request.META.get("HTTP_X_FORWARDED_FOR", "").split(",")[0].strip() or request.META.get("REMOTE_ADDR")


def _employee_required(request):
    return getattr(request.user, "employee_profile", None)


@perm_required("hr_ops.manage_company_vault")
def vault_list(request):
    tenant = request.tenant
    vault.expire_stale_grants(tenant)
    documents = CompanyDocument.objects.filter(tenant=tenant).order_by("doc_type", "title")
    pending_count = CompanyDocumentAccessRequest.objects.filter(tenant=tenant, status="pending").count()
    return render(request, "hr_ops/company_vault_list.html", {
        "documents": documents,
        "pending_count": pending_count,
        "doc_types": CompanyDocument.DOC_TYPES,
    })


@perm_required("hr_ops.manage_company_vault")
def vault_upload(request, pk=None):
    tenant = request.tenant
    doc = get_object_or_404(CompanyDocument, pk=pk, tenant=tenant) if pk else None

    if request.method == "POST":
        form = CompanyDocumentForm(request.POST, request.FILES, instance=doc)
        if form.is_valid():
            obj = form.save(commit=False)
            obj.tenant = tenant
            if not obj.uploaded_by_id:
                obj.uploaded_by = request.user
            if request.FILES.get("file"):
                f = request.FILES["file"]
                obj.file_size_bytes = f.size
                obj.mime_type = getattr(f, "content_type", "") or ""
            obj.save()
            audit_log(
                tenant,
                request.user,
                "create" if not pk else "update",
                "CompanyDocument",
                obj,
                f"{'Uploaded' if not pk else 'Updated'} company vault document: {obj.title}",
                ip_address=_client_ip(request),
            )
            messages.success(request, f'"{obj.title}" saved to company vault.')
            return redirect("hr_ops:company_vault_list")
    else:
        form = CompanyDocumentForm(instance=doc)

    return render(request, "hr_ops/company_vault_form.html", {"form": form, "document": doc})


@login_required
def vault_download(request, pk):
    tenant = request.tenant
    doc = get_object_or_404(CompanyDocument, pk=pk, tenant=tenant, is_active=True)
    if not vault.employee_can_download(request.user, doc):
        messages.error(request, "You do not have access to this document.")
        return redirect("tenants:dashboard")

    audit_log(
        tenant,
        request.user,
        "download",
        "CompanyDocument",
        doc,
        f"Downloaded company vault document: {doc.title}",
        ip_address=_client_ip(request),
    )
    try:
        return FileResponse(doc.file.open("rb"), as_attachment=False, filename=doc.file.name.split("/")[-1])
    except FileNotFoundError as exc:
        raise Http404("File not found") from exc


@perm_required("hr_ops.manage_company_vault")
@require_POST
def vault_deactivate(request, pk):
    doc = get_object_or_404(CompanyDocument, pk=pk, tenant=request.tenant)
    doc.is_active = False
    doc.save(update_fields=["is_active", "updated_at"])
    messages.success(request, f'"{doc.title}" archived.')
    return redirect("hr_ops:company_vault_list")


@perm_required("hr_ops.manage_company_vault")
def access_request_queue(request):
    tenant = request.tenant
    vault.expire_stale_grants(tenant)
    status = request.GET.get("status", "pending")
    qs = CompanyDocumentAccessRequest.objects.filter(tenant=tenant).select_related(
        "employee", "document", "reviewed_by"
    )
    if status:
        qs = qs.filter(status=status)
    return render(request, "hr_ops/company_vault_requests.html", {
        "requests": qs.order_by("-created_at")[:100],
        "status_filter": status,
        "status_choices": CompanyDocumentAccessRequest.STATUS_CHOICES,
        "pending_count": CompanyDocumentAccessRequest.objects.filter(tenant=tenant, status="pending").count(),
    })


@perm_required("hr_ops.manage_company_vault")
def access_request_review(request, pk):
    tenant = request.tenant
    req = get_object_or_404(
        CompanyDocumentAccessRequest.objects.select_related("employee", "document"),
        pk=pk,
        tenant=tenant,
    )
    available_docs = CompanyDocument.objects.filter(
        tenant=tenant, doc_type=req.doc_type, is_active=True
    ).order_by("title")

    if request.method == "POST":
        action = request.POST.get("action")
        try:
            if action == "approve":
                doc_id = request.POST.get("document_id")
                days = int(request.POST.get("access_days") or vault.DEFAULT_ACCESS_DAYS)
                document = get_object_or_404(CompanyDocument, pk=doc_id, tenant=tenant, is_active=True)
                vault.approve_access_request(req, request.user, document, access_days=days, ip=_client_ip(request))
                messages.success(request, f"Access granted to {req.employee.full_name} for {days} days.")
                return redirect("hr_ops:company_vault_requests")
            if action == "deny":
                vault.deny_access_request(
                    req, request.user, request.POST.get("denial_reason", ""), ip=_client_ip(request)
                )
                messages.success(request, "Request denied.")
                return redirect("hr_ops:company_vault_requests")
        except (ValueError, TypeError) as exc:
            messages.error(request, str(exc))

    return render(request, "hr_ops/company_vault_request_review.html", {
        "req": req,
        "available_docs": available_docs,
        "default_access_days": vault.DEFAULT_ACCESS_DAYS,
    })


@login_required
def my_doc_requests(request):
    employee = _employee_required(request)
    if not employee:
        return redirect("tenants:dashboard")
    vault.expire_stale_grants(request.tenant)
    qs = CompanyDocumentAccessRequest.objects.filter(
        tenant=request.tenant, employee=employee
    ).select_related("document", "reviewed_by").order_by("-created_at")
    return render(request, "hr_ops/company_doc_my_requests.html", {"requests": qs})


@login_required
def my_doc_request_detail(request, pk):
    employee = _employee_required(request)
    if not employee:
        return redirect("tenants:dashboard")
    req = get_object_or_404(
        CompanyDocumentAccessRequest.objects.select_related("document", "reviewed_by"),
        pk=pk,
        tenant=request.tenant,
        employee=employee,
    )
    if req.status == "approved" and req.access_expires_at and req.access_expires_at < timezone.now():
        req.status = "expired"
        req.save(update_fields=["status", "updated_at"])
    return render(request, "hr_ops/company_doc_request_detail.html", {"req": req})


@login_required
def doc_request_create(request):
    employee = _employee_required(request)
    if not employee:
        messages.error(request, "Employee profile required.")
        return redirect("tenants:dashboard")

    if request.method == "POST":
        form = CompanyDocAccessRequestForm(request.POST)
        if form.is_valid():
            try:
                vault.submit_access_request(
                    request.tenant,
                    employee,
                    doc_type=form.cleaned_data["doc_type"],
                    purpose=form.cleaned_data["purpose"],
                )
                messages.success(request, "Your request was sent to company admin for review.")
                return redirect("hr_ops:my_company_doc_requests")
            except ValueError as exc:
                messages.error(request, str(exc))
    else:
        form = CompanyDocAccessRequestForm()

    return render(request, "hr_ops/company_doc_request_form.html", {
        "form": form,
        "can_manage_vault": can_manage_company_vault(request.user),
    })
