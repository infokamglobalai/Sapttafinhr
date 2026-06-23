"""Celebration posts — notify company, default titles."""
from __future__ import annotations

from django.urls import reverse
from django.utils import timezone

from apps.employees.models import Employee

from .models import CelebrationPost
from .services import notify


def default_title_for_type(celebration_type: str, employee=None) -> str:
    emoji = CelebrationPost.TYPE_EMOJI.get(celebration_type, "✨")
    labels = dict(CelebrationPost.CELEBRATION_TYPES)
    label = labels.get(celebration_type, "Celebration")
    if employee:
        if celebration_type == "birthday":
            return f"{emoji} Happy Birthday, {employee.first_name}!"
        if celebration_type == "work_anniversary":
            return f"{emoji} Work Anniversary — {employee.full_name}"
        if celebration_type == "new_joiner":
            return f"{emoji} Welcome to the team, {employee.first_name}!"
        return f"{emoji} {label} — {employee.full_name}"
    return f"{emoji} {label}"


def default_message_for_type(celebration_type: str, employee=None, tenant_name: str = "") -> str:
    name = employee.first_name if employee else "everyone"
    company = tenant_name or "the team"
    messages = {
        "birthday": f"Wishing {name} a wonderful birthday! May your day be filled with joy. — {company}",
        "work_anniversary": f"Congratulations on your work anniversary! Thank you for your dedication. — {company}",
        "new_joiner": f"Welcome aboard, {name}! We're excited to have you on the team.",
        "promotion": f"Congratulations on your promotion, {name}! Well deserved.",
        "wedding": f"Heartfelt congratulations on your wedding, {name}!",
        "new_baby": f"Congratulations on the new arrival, {name}!",
        "festival": f"Warm wishes to everyone at {company} on this special occasion!",
        "achievement": f"Congratulations on this achievement, {name}!",
        "farewell": f"Thank you for your contributions, {name}. Best wishes for the future!",
        "custom": f"Celebrating with {name} and the whole team!",
    }
    return messages.get(celebration_type, messages["custom"])


def publish_celebration(post: CelebrationPost, notify_company: bool = True) -> CelebrationPost:
    if not post.published_at:
        post.published_at = timezone.now()
    post.is_published = True
    post.save(update_fields=["is_published", "published_at"])

    if notify_company:
        notify_company_about_celebration(post)
    return post


def notify_company_about_celebration(post: CelebrationPost, exclude_user_id=None):
    action_url = reverse("hr_ops:celebration_detail", args=[post.pk])
    title = post.display_title
    snippet = (post.message or "")[:240]
    employees = (
        Employee.objects.filter(tenant=post.tenant, is_active=True, user__isnull=False)
        .select_related("user")
    )
    for emp in employees:
        if exclude_user_id and emp.user_id == exclude_user_id:
            continue
        notify(
            emp.user,
            "celebration",
            title,
            message=snippet,
            action_url=action_url,
            send_email=False,
        )


def celebration_feed_queryset(tenant):
    return (
        CelebrationPost.objects.filter(tenant=tenant, is_published=True)
        .select_related("subject_employee", "created_by", "subject_employee__department")
        .prefetch_related("wishes__author")
    )
