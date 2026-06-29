"""Settlement statement acknowledgement — online (in-app) or offline (paper)."""
from __future__ import annotations

from django.utils import timezone

from .models import ExitRequest


def acknowledge_settlement_hr(exit_request: ExitRequest, *, actor, method: str) -> ExitRequest:
    if method not in dict(ExitRequest.ACK_METHOD_CHOICES):
        raise ValueError("Invalid acknowledgement method.")
    exit_request.hr_acknowledged_by = actor
    exit_request.hr_acknowledged_at = timezone.now()
    exit_request.hr_acknowledgement_method = method
    exit_request.save(
        update_fields=[
            "hr_acknowledged_by",
            "hr_acknowledged_at",
            "hr_acknowledgement_method",
        ]
    )
    return exit_request


def acknowledge_settlement_employee(exit_request: ExitRequest, *, method: str) -> ExitRequest:
    if method not in dict(ExitRequest.ACK_METHOD_CHOICES):
        raise ValueError("Invalid acknowledgement method.")
    exit_request.employee_acknowledged_at = timezone.now()
    exit_request.employee_acknowledgement_method = method
    exit_request.save(
        update_fields=[
            "employee_acknowledged_at",
            "employee_acknowledgement_method",
        ]
    )
    return exit_request
