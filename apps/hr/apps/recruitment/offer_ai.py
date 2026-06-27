"""AI offer letter text generation (Recruitment → HR Letters handoff)."""
from __future__ import annotations

import html
import logging
import re
from datetime import date

logger = logging.getLogger(__name__)


def generate_offer_letter_text(
    tenant,
    *,
    candidate_name: str,
    role: str,
    department: str = "",
    salary: str = "",
    joining_date: str = "",
    probation_months: int = 3,
) -> str:
    """Return offer letter body text (plain / light markdown)."""
    company_name = tenant.name if tenant else "The Company"
    company_address = (getattr(tenant, "address", None) or "") or "Company Address"

    from django.conf import settings

    api_key = getattr(settings, "ANTHROPIC_API_KEY", "")
    if not api_key:
        return _template_offer(
            candidate_name, role, department, salary, joining_date,
            company_name, company_address, probation_months,
        )

    try:
        import anthropic

        client = anthropic.Anthropic(api_key=api_key)
        prompt = f"""Write a professional offer letter for the following:

Candidate: {candidate_name}
Role: {role}
Department: {department or 'Not specified'}
Company: {company_name}
Company Address: {company_address}
CTC/Salary: {salary or 'As discussed'}
Joining Date: {joining_date or 'To be confirmed'}
Probation Period: {probation_months} months
Date of Letter: {date.today().strftime('%d %B %Y')}

Include: formal header, offer details, compensation, probation, acceptance request, warm closing.
Format as a proper letter. Keep professional and clear. No placeholder brackets."""

        response = client.messages.create(
            model=getattr(settings, "ANTHROPIC_MODEL", "claude-sonnet-4-6"),
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}],
        )
        return response.content[0].text
    except Exception:
        logger.exception("Offer letter generation failed")
        return _template_offer(
            candidate_name, role, department, salary, joining_date,
            company_name, company_address, probation_months,
        )


def _template_offer(name, role, dept, salary, joining, company, address, probation):
    return f"""{company}
{address}
Date: {date.today().strftime('%d %B %Y')}

Dear {name},

**LETTER OF OFFER — {role.upper()}**

We are pleased to extend this offer of employment for the position of **{role}**{(' in the ' + dept + ' department') if dept else ''} at {company}.

**Terms of Employment:**
• Designation: {role}
• Department: {dept or 'As applicable'}
• Date of Joining: {joining or 'To be mutually agreed'}
• Compensation: {salary or 'As discussed during the interview process'}
• Probation Period: {probation} months from the date of joining

This offer is subject to satisfactory completion of background verification and submission of required documents before joining.

Please sign and return a copy of this letter as acceptance of the offer by [Date + 7 days].

We look forward to welcoming you to the {company} family!

Warm regards,

HR Manager
{company}

Accepted by: _________________ Date: _________________"""


def _inline_md(text: str) -> str:
    text = html.escape(text)
    return re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", text)


def offer_text_to_html(text: str) -> str:
    """Convert AI/plain offer text to safe HTML for letter draft body."""
    text = (text or "").strip()
    if not text:
        return ""

    blocks = []
    for para in re.split(r"\n\s*\n", text):
        para = para.strip()
        if not para:
            continue
        lines = [ln.strip() for ln in para.split("\n") if ln.strip()]
        if lines and all(re.match(r"^[\•\-]\s", ln) for ln in lines):
            items = "".join(
                f"<li>{_inline_md(re.sub(r'^[\•\-]\s*', '', ln))}</li>" for ln in lines
            )
            blocks.append(f"<ul>{items}</ul>")
        else:
            inner = "<br>".join(_inline_md(ln) for ln in lines)
            blocks.append(f"<p>{inner}</p>")
    return "\n".join(blocks)
