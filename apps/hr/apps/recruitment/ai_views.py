"""AI-powered recruitment tools — JD generator, resume parser."""
import json
import logging
from django.http import JsonResponse
from django.views import View
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from utils.access import hr_admin_required

logger = logging.getLogger(__name__)


@method_decorator([hr_admin_required, csrf_exempt], name="dispatch")
class JDGeneratorView(View):
    """POST /recruitment/ai/generate-jd/
    Body: {role_title, department, experience_years, skills[], salary_range, company_name}
    Returns: {jd_text}
    """

    def post(self, request):
        try:
            data = json.loads(request.body.decode())
        except (ValueError, UnicodeDecodeError):
            return JsonResponse({"error": "Invalid JSON"}, status=400)

        role = data.get("role_title", "").strip()
        if not role:
            return JsonResponse({"error": "role_title required"}, status=400)

        tenant = getattr(request, "tenant", None)
        company_name = (tenant.name if tenant else None) or data.get("company_name", "Our Company")
        department = data.get("department", "")
        experience = data.get("experience_years", "2-5")
        skills = data.get("skills", [])
        salary_range = data.get("salary_range", "")

        from django.conf import settings
        api_key = getattr(settings, "ANTHROPIC_API_KEY", "")

        if not api_key:
            return JsonResponse({"jd_text": self._template_jd(role, company_name, department, experience, skills, salary_range)})

        try:
            import anthropic

            from django.conf import settings as _settings
            from .ai_utils import parse_llm_json
            client = anthropic.Anthropic(api_key=api_key)
            prompt = f"""Write a professional job description AND extract its structured components.

Role: {role}
Company: {company_name}
Department: {department or 'Not specified'}
Experience: {experience} years
Key skills: {', '.join(skills) if skills else 'to be determined by hiring team'}
Salary range: {salary_range or 'Competitive, based on experience'}

Return ONLY valid JSON with this exact structure:
{{
  "jd_text": "<full JD, 350-450 words, sections: Role Overview, Key Responsibilities (6-8 bullets), Requirements (5-6 bullets), Nice to Have (3 bullets), What We Offer. No placeholder brackets.>",
  "mandatory_skills": ["<must-have skill>", "..."],
  "preferred_skills": ["<nice-to-have skill>", "..."],
  "qualifications": ["<education / qualification>", "..."],
  "certifications": ["<relevant certification>", "..."],
  "keywords": ["<searchable keyword>", "..."],
  "competencies": ["<behavioural competency>", "..."]
}}"""

            response = client.messages.create(
                model=getattr(_settings, "ANTHROPIC_MODEL", "claude-sonnet-4-6"),
                max_tokens=1536,
                messages=[{"role": "user", "content": prompt}]
            )
            parsed = parse_llm_json(response.content[0].text)
            jd_text = parsed.get("jd_text") or response.content[0].text
            structured = {
                k: parsed.get(k, [])
                for k in ("mandatory_skills", "preferred_skills", "qualifications",
                          "certifications", "keywords", "competencies")
            }
            return JsonResponse({"jd_text": jd_text, "role": role, "company": company_name, **structured})
        except Exception:
            logger.exception("JD generation failed")
            jd_text = self._template_jd(role, company_name, department, experience, skills, salary_range)

        return JsonResponse({"jd_text": jd_text, "role": role, "company": company_name})

    def _template_jd(self, role, company, dept, exp, skills, salary):
        return f"""**{role}**
**{company}** | {dept or 'Technology'}

**About the Role**
We are looking for an experienced {role} to join our growing team. This is an exciting opportunity to make a meaningful impact at {company}.

**Key Responsibilities**
• Design, develop and maintain systems related to the {role} function
• Collaborate with cross-functional teams to deliver high-quality outcomes
• Drive continuous improvement in processes and deliverables
• Mentor junior team members and contribute to knowledge sharing
• Stay updated with industry trends and best practices

**Requirements**
• {exp} years of relevant experience
• Strong proficiency in {', '.join(skills[:3]) if skills else 'core skills for this role'}
• Excellent communication and problem-solving skills
• Ability to work in a fast-paced, dynamic environment
• Bachelor's degree in a relevant field

**What We Offer**
• Competitive salary {('(' + salary + ')') if salary else ''}
• Health and wellness benefits
• Growth and learning opportunities
• Collaborative and inclusive work culture"""


@method_decorator([hr_admin_required, csrf_exempt], name="dispatch")
class OfferLetterGeneratorView(View):
    """POST /recruitment/ai/generate-offer/
    Body: {employee_id or candidate_name, role, department, salary, joining_date}
    """

    def post(self, request):
        try:
            data = json.loads(request.body.decode())
        except (ValueError, UnicodeDecodeError):
            return JsonResponse({"error": "Invalid JSON"}, status=400)

        tenant = getattr(request, "tenant", None)
        company_name = tenant.name if tenant else "The Company"
        company_address = (tenant.address if tenant else "") or "Company Address"

        candidate_name = data.get("candidate_name", "Candidate")
        role = data.get("role", "")
        department = data.get("department", "")
        salary = data.get("salary", "")
        joining_date = data.get("joining_date", "")
        probation_months = data.get("probation_months", 3)

        if not role:
            return JsonResponse({"error": "role required"}, status=400)

        from django.conf import settings
        api_key = getattr(settings, "ANTHROPIC_API_KEY", "")

        if not api_key:
            return JsonResponse({"letter_text": self._template_offer(candidate_name, role, department, salary, joining_date, company_name, company_address, probation_months)})

        try:
            import anthropic
            from datetime import date
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
                model="claude-sonnet-4-6",
                max_tokens=1024,
                messages=[{"role": "user", "content": prompt}]
            )
            letter_text = response.content[0].text
        except Exception:
            logger.exception("Offer letter generation failed")
            letter_text = self._template_offer(candidate_name, role, department, salary, joining_date, company_name, company_address, probation_months)

        return JsonResponse({"letter_text": letter_text, "candidate": candidate_name, "role": role})

    def _template_offer(self, name, role, dept, salary, joining, company, address, probation):
        from datetime import date
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


@method_decorator([hr_admin_required, csrf_exempt], name="dispatch")
class ResumeParsViewView(View):
    """POST /recruitment/ai/parse-resume/ — multipart upload of PDF/DOCX.
    Returns extracted candidate profile for ATS pre-fill.
    """
    def post(self, request):
        file = request.FILES.get("file")
        if not file:
            return JsonResponse({"error": "file required"}, status=400)
        from django.core.exceptions import ValidationError as _VErr
        from utils.uploads import RESUME_EXTS, validate_upload
        try:
            validate_upload(file, allowed_exts=RESUME_EXTS, max_mb=10)
        except _VErr as exc:
            return JsonResponse({"error": exc.messages[0] if exc.messages else "Invalid file."}, status=400)
        raw = file.read()
        from .resume_parser import parse_resume
        result = parse_resume(raw, file.name)
        return JsonResponse(result)


@method_decorator([hr_admin_required, csrf_exempt], name="dispatch")
class ResumeRankView(View):
    """POST /recruitment/ai/rank-resumes/
    Body: {job_opening_id, application_ids: []} (application_ids optional — ranks all)
    Returns: {ranked: [{application_id, candidate_name, score, band, strengths, gaps, recommendation}]}
    """

    def post(self, request):
        try:
            data = json.loads(request.body.decode())
        except (ValueError, UnicodeDecodeError):
            return JsonResponse({"error": "Invalid JSON"}, status=400)

        job_opening_id = data.get("job_opening_id")
        if not job_opening_id:
            return JsonResponse({"error": "job_opening_id required"}, status=400)

        from .models import JobOpening, JobApplication
        from . import scoring
        try:
            job = JobOpening.objects.get(pk=job_opening_id, tenant=request.tenant)
        except JobOpening.DoesNotExist:
            return JsonResponse({"error": "Job opening not found"}, status=404)

        app_ids = data.get("application_ids") or []
        qs = JobApplication.objects.filter(
            job_opening=job
        ).select_related("candidate", "candidate__profile")
        if app_ids:
            qs = qs.filter(pk__in=app_ids)

        applications = list(qs[:50])  # safety cap
        if not applications:
            return JsonResponse({"error": "No applications found"}, status=404)

        from django.conf import settings
        api_key = getattr(settings, "ANTHROPIC_API_KEY", "")
        if not api_key:
            return JsonResponse({"error": "ANTHROPIC_API_KEY not configured"}, status=503)

        jd_text = scoring.build_jd_text(job)
        weights = scoring.weights_for(job)

        results = []
        for app in applications:
            score_data = scoring.score_candidate(app.candidate, jd_text, weights, api_key)
            scoring.persist_score(app, score_data)
            results.append({
                "application_id": app.id,
                "candidate_id": app.candidate.id,
                "candidate_name": app.candidate.display_name,
                "current_role": app.candidate.current_designation,
                "experience_years": float(app.candidate.total_experience or 0),
                "recommendation_label": app.recommendation_label,
                **score_data,
            })

        results.sort(key=lambda x: x.get("score", 0), reverse=True)
        return JsonResponse({"job_title": job.title, "ranked": results, "total": len(results),
                             "weights": weights})
