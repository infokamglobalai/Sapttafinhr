"""Shared employee directory search filters."""
from django.db.models import Q


def filter_employees_by_search(qs, term: str):
    term = (term or "").strip()
    if not term:
        return qs
    return qs.filter(
        Q(first_name__icontains=term)
        | Q(middle_name__icontains=term)
        | Q(last_name__icontains=term)
        | Q(preferred_name__icontains=term)
        | Q(employee_code__icontains=term)
        | Q(official_email__icontains=term)
        | Q(personal_email__icontains=term)
        | Q(department__name__icontains=term)
        | Q(designation__name__icontains=term)
        | Q(user__email__icontains=term)
    )
