"""Letter generation helpers — context, defaults, seeding."""
from __future__ import annotations

import datetime

from django.db import transaction

from .letter_company import get_company_profile, save_company_profile
from .letter_defaults import DEFAULT_LETTER_TEMPLATES, get_default_html, get_default_name
from .models import LetterTemplate


def build_letter_context(tenant, employee, extra: dict | None = None) -> dict:
    company = get_company_profile(tenant)
    salary = employee.get_current_salary()
    ctx = {
        "employee": employee,
        "tenant": tenant,
        "company": company.as_context(),
        "today": datetime.date.today(),
        "today_formatted": datetime.date.today().strftime("%d %B %Y"),
        "ctc": salary.ctc_annual if salary else "",
        "new_ctc": "",
        "joining_date": employee.date_of_joining,
        "last_working_day": employee.date_of_exit or "",
        "resignation_date": "",
        "effective_date": "",
        "warning_reason": "",
        "warning_subject": "",
        "appreciation_reason": "",
    }
    if extra:
        ctx.update({k: v for k, v in extra.items() if v})
    return ctx


@transaction.atomic
def seed_default_letter_templates(tenant, created_by=None) -> tuple[int, int]:
    """Create missing default templates. Returns (created_count, skipped_count)."""
    created = skipped = 0
    existing_types = set(
        LetterTemplate.objects.filter(tenant=tenant).values_list("letter_type", flat=True)
    )
    for letter_type in DEFAULT_LETTER_TEMPLATES:
        if letter_type in existing_types:
            skipped += 1
            continue
        LetterTemplate.objects.create(
            tenant=tenant,
            letter_type=letter_type,
            name=get_default_name(letter_type),
            template_html=get_default_html(letter_type),
            is_active=True,
            created_by=created_by,
        )
        created += 1
    return created, skipped
