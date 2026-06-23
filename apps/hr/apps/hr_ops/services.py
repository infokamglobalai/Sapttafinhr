"""
HR operations service layer.
Letter generation using Jinja2 + WeasyPrint.
Notification dispatch (in-app + email).
"""
import logging

logger = logging.getLogger(__name__)


# ──────────────────────────────────────────────────────────────────────────
# Notifications
# ──────────────────────────────────────────────────────────────────────────
def notify(recipient, notification_type, title, message="", action_url="", send_email=True, email_template=None):
    """
    Create an in-app notification and (optionally) send an email.

    Args:
        recipient: User object (the person to notify)
        notification_type: one of Notification.TYPE_CHOICES
        title: short headline
        message: longer body
        action_url: where the in-app "view" button should link to
        send_email: whether to also send an email
        email_template: optional template path overriding default

    Returns:
        Notification instance
    """
    from .models import Notification
    from django.conf import settings
    from django.core.mail import EmailMultiAlternatives
    from django.template.loader import render_to_string
    from django.utils.html import strip_tags

    if not recipient or not recipient.tenant_id:
        # Skip if recipient has no tenant (e.g. platform superuser)
        return None

    notif = Notification.objects.create(
        tenant=recipient.tenant,
        recipient=recipient,
        notification_type=notification_type,
        title=title,
        message=message,
        action_url=action_url,
    )

    if send_email and recipient.email:
        try:
            tmpl_path = email_template or "emails/notification.html"
            context = {
                "title": title, "message": message,
                "action_url": action_url, "recipient": recipient,
                "tenant": recipient.tenant,
                "site_url": f"https://{recipient.tenant.subdomain}.{settings.HRMS_TENANT_DOMAIN}",
            }
            html_body = render_to_string(tmpl_path, context)
            text_body = strip_tags(html_body)
            email = EmailMultiAlternatives(
                subject=f"[{recipient.tenant.name}] {title}",
                body=text_body,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[recipient.email],
            )
            email.attach_alternative(html_body, "text/html")
            email.send(fail_silently=True)
            notif.email_sent = True
            notif.save(update_fields=["email_sent"])
        except Exception as exc:
            logger.warning("Email send failed for notification %s: %s", notif.id, exc)

    return notif


# ──────────────────────────────────────────────────────────────────────────
# Audit log helper
# ──────────────────────────────────────────────────────────────────────────
def audit_log(tenant, actor, action, resource_type, resource, summary, details=None, ip_address=None):
    """
    Record an audit entry.

    Args:
        tenant: Tenant instance
        actor: User who did the action (or None for system)
        action: one of AuditLog.ACTION_CHOICES
        resource_type: model name string, e.g. "Employee"
        resource: the model instance (used to grab pk + a label)
        summary: human-readable one-liner
        details: optional dict with before/after data
    """
    from .models import AuditLog
    try:
        AuditLog.objects.create(
            tenant=tenant,
            actor=actor if actor and getattr(actor, "pk", None) else None,
            actor_name=str(actor) if actor else "system",
            action=action,
            resource_type=resource_type,
            resource_id=str(getattr(resource, "pk", "")) if resource else "",
            resource_label=str(resource)[:255] if resource else "",
            summary=summary[:500],
            details=details or {},
            ip_address=ip_address,
        )
    except Exception as exc:
        logger.warning("Audit log write failed: %s", exc)



import datetime
from django.utils import timezone
from django.core.files.base import ContentFile

from .models import LetterTemplate, HRLetter


def generate_letter(tenant, employee, template: LetterTemplate, generated_by, extra_context: dict = None) -> HRLetter:
    """
    Render a LetterTemplate for an employee and save as PDF.
    template_html is a Jinja2 string with access to employee, tenant, company, today.
    """
    from jinja2 import Environment
    from utils.pdf import render_html_to_pdf
    from .letter_services import build_letter_context

    env = Environment(autoescape=True)
    tmpl = env.from_string(template.template_html)
    context = build_letter_context(tenant, employee, extra_context)
    html_content = tmpl.render(**context)

    full_html = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {{ font-family: Arial, sans-serif; font-size: 12pt; margin: 40px; color: #111; }}
        .header {{ text-align: center; margin-bottom: 30px; }}
        .content {{ line-height: 1.6; }}
        .signature {{ margin-top: 60px; }}
        table {{ width: 100%; }}
      </style>
    </head>
    <body>{html_content}</body>
    </html>
    """

    pdf_bytes = render_html_to_pdf(full_html)

    letter = HRLetter(
        tenant=tenant,
        employee=employee,
        template=template,
        letter_type=template.letter_type,
        generated_by=generated_by,
    )
    filename = f"{template.letter_type}_{employee.employee_code}_{datetime.date.today()}.pdf"
    letter.pdf.save(filename, ContentFile(pdf_bytes), save=False)
    letter.save()
    return letter


def start_onboarding(tenant, employee, template=None):
    """Create onboarding record and populate tasks from template."""
    from .models import EmployeeOnboarding, OnboardingItem, OnboardingTemplate
    import datetime

    if template is None:
        template = OnboardingTemplate.objects.filter(tenant=tenant, is_default=True).first()

    if not template:
        return None

    onboarding, created = EmployeeOnboarding.objects.get_or_create(
        tenant=tenant, employee=employee,
        defaults={"template": template},
    )
    if not created:
        return onboarding

    doj = employee.date_of_joining
    for task in template.tasks.all():
        due_date = doj + datetime.timedelta(days=task.due_days_offset)
        OnboardingItem.objects.create(
            onboarding=onboarding,
            task=task,
            due_date=due_date,
        )

    # Notify the employee + their manager that onboarding has started
    try:
        if employee.user:
            notify(
                employee.user, "general",
                "Welcome aboard! Your onboarding is underway",
                message=f"Hi {employee.first_name},\n\nYour onboarding checklist is ready. "
                        f"Your HR team will guide you through each step over the next few weeks.",
                action_url="/hr/my/onboarding/",
            )
        if employee.reporting_manager and employee.reporting_manager.user:
            notify(
                employee.reporting_manager.user, "general",
                f"Onboarding started for {employee.full_name}",
                message=f"{employee.full_name} ({employee.designation.name if employee.designation else 'new hire'}) "
                        f"joined on {doj.strftime('%d %b')}. Some tasks need your input.",
                action_url=f"/hr/onboarding/{onboarding.pk}/",
            )
    except Exception:
        pass

    return onboarding
