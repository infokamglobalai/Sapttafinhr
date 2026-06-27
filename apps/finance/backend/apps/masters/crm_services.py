"""CRM lite — lead stage moves, party linking, follow-ups."""
from __future__ import annotations

from django.db import transaction
from django.utils import timezone

from .models import Party, SalesLead

OPEN_STAGES = (
    SalesLead.Stage.NEW,
    SalesLead.Stage.CONTACTED,
    SalesLead.Stage.QUALIFIED,
    SalesLead.Stage.PROPOSAL,
    SalesLead.Stage.NEGOTIATION,
)


def move_lead_stage(lead: SalesLead, new_stage: str) -> SalesLead:
    if new_stage not in dict(SalesLead.Stage.choices):
        raise ValueError("Invalid stage")
    lead.stage = new_stage
    if new_stage in (SalesLead.Stage.WON, SalesLead.Stage.LOST):
        lead.closed_at = timezone.now()
    else:
        lead.closed_at = None
        lead.lost_reason = ""
    lead.save(update_fields=["stage", "closed_at", "lost_reason", "updated_at"])
    return lead


@transaction.atomic
def ensure_party_for_lead(lead: SalesLead) -> Party:
    if lead.party_id:
        return lead.party
    name = (lead.organization or lead.contact_name or lead.title).strip()
    if not name:
        raise ValueError("Add organization or contact name before creating a customer record.")

    party = Party.objects.create(
        company=lead.company,
        kind=Party.Kind.CUSTOMER,
        name=name,
        email=(lead.email or "").strip(),
        phone=(lead.phone or "").strip(),
    )
    lead.party = party
    lead.save(update_fields=["party", "updated_at"])
    if lead.stage == SalesLead.Stage.NEW:
        move_lead_stage(lead, SalesLead.Stage.CONTACTED)
    return party


def pipeline_summary(company) -> dict:
    from datetime import date
    from django.db.models import Sum

    today = date.today()
    qs = SalesLead.objects.filter(company=company)
    open_qs = qs.filter(stage__in=OPEN_STAGES)
    agg = open_qs.aggregate(total=Sum("expected_value"))
    return {
        "open_count": open_qs.count(),
        "pipeline_value": str(agg["total"] or 0),
        "won_count": qs.filter(stage=SalesLead.Stage.WON).count(),
        "lost_count": qs.filter(stage=SalesLead.Stage.LOST).count(),
        "due_today": open_qs.filter(next_follow_up=today).count(),
        "overdue": open_qs.filter(next_follow_up__lt=today).exclude(next_follow_up__isnull=True).count(),
    }
