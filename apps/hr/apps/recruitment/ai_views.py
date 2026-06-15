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
            client = anthropic.Anthropic(api_key=api_key)
            prompt = f"""Write a professional job description for the following role. Format: Role Overview, Key Responsibilities (6-8 bullets), Requirements (5-6 bullets), Nice to Have (3 bullets), What We Offer.

Role: {role}
Company: {company_name}
Department: {department or 'Not specified'}
Experience: {experience} years
Key skills: {', '.join(skills) if skills else 'to be determined by hiring team'}
Salary range: {salary_range or 'Competitive, based on experience'}

Keep it engaging, specific to the role, and 350-450 words. Do not use placeholder brackets."""

            response = client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=1024,
                messages=[{"role": "user", "content": prompt}]
            )
            jd_text = response.content[0].text
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

        from .models import JobOpening, JobApplication, Candidate
        try:
            job = JobOpening.objects.get(pk=job_opening_id, tenant=request.tenant)
        except JobOpening.DoesNotExist:
            return JsonResponse({"error": "Job opening not found"}, status=404)

        app_ids = data.get("application_ids") or []
        qs = JobApplication.objects.filter(
            job_opening=job
        ).select_related("candidate")
        if app_ids:
            qs = qs.filter(pk__in=app_ids)

        applications = list(qs[:50])  # safety cap
        if not applications:
            return JsonResponse({"error": "No applications found"}, status=404)

        from django.conf import settings
        api_key = getattr(settings, "ANTHROPIC_API_KEY", "")
        if not api_key:
            return JsonResponse({"error": "ANTHROPIC_API_KEY not configured"}, status=503)

        jd_text = self._build_jd_text(job)
        from django.utils import timezone

        results = []
        for app in applications:
            score_data = self._score_candidate(app.candidate, jd_text, job, api_key)
            app.ai_score = score_data.get("score")
            app.ai_band = score_data.get("band", "")
            app.ai_recommendation = score_data.get("recommendation", "")
            app.ai_ranked_at = timezone.now()
            app.save(update_fields=["ai_score", "ai_band", "ai_recommendation", "ai_ranked_at", "updated_at"])
            results.append({
                "application_id": app.id,
                "candidate_id": app.candidate.id,
                "candidate_name": f"{app.candidate.first_name} {app.candidate.last_name}".strip(),
                "current_role": app.candidate.current_designation,
                "experience_years": float(app.candidate.total_experience or 0),
                **score_data,
            })

        results.sort(key=lambda x: x.get("score", 0), reverse=True)
        return JsonResponse({"job_title": job.title, "ranked": results, "total": len(results)})

    def _build_jd_text(self, job) -> str:
        parts = [f"Job Title: {job.title}"]
        if job.department:
            parts.append(f"Department: {job.department.name}")
        parts.append(f"Experience Required: {job.experience_min}–{job.experience_max or '+'} years")
        if job.description:
            parts.append(f"Description:\n{job.description}")
        if job.requirements:
            parts.append(f"Requirements:\n{job.requirements}")
        return "\n\n".join(parts)

    def _score_candidate(self, candidate, jd_text: str, job, api_key: str) -> dict:
        # Build candidate summary from DB fields + resume text
        resume_text = ""
        if candidate.resume:
            try:
                from .resume_parser import _extract_text
                resume_text = _extract_text(candidate.resume.read(), candidate.resume.name)[:3000]
            except Exception:
                pass

        candidate_summary = (
            f"Name: {candidate.first_name} {candidate.last_name}\n"
            f"Current Role: {candidate.current_designation or 'N/A'}\n"
            f"Current Company: {candidate.current_company or 'N/A'}\n"
            f"Total Experience: {candidate.total_experience or 0} years\n"
        )
        if resume_text:
            candidate_summary += f"\nResume:\n{resume_text}"

        prompt = f"""You are an expert recruiter. Score this candidate against the job description.

JOB DESCRIPTION:
{jd_text}

CANDIDATE PROFILE:
{candidate_summary}

Return ONLY valid JSON with this exact structure:
{{
  "score": <integer 0-100>,
  "band": "<Excellent|Good|Average|Poor>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "gaps": ["<gap 1>", "<gap 2>"],
  "recommendation": "<one sentence hiring recommendation>"
}}

Scoring guide: 80-100=Excellent match, 60-79=Good, 40-59=Average, 0-39=Poor.
Be objective. Only use information present in the candidate profile."""

        try:
            import anthropic
            client = anthropic.Anthropic(api_key=api_key)
            response = client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=512,
                messages=[{"role": "user", "content": prompt}]
            )
            raw = response.content[0].text.strip()
            if "```" in raw:
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]
            return json.loads(raw)
        except Exception as e:
            logger.exception("Resume scoring failed for candidate %s", candidate.id)
            return {
                "score": 0,
                "band": "Error",
                "strengths": [],
                "gaps": [],
                "recommendation": f"Scoring failed: {e}",
            }
