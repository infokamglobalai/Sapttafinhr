from django import forms
from .models import PerformanceReview

INPUT = "input input-bordered w-full"
SELECT = "select select-bordered w-full"
TEXTAREA = "textarea textarea-bordered w-full"


class PerformanceReviewForm(forms.ModelForm):
    class Meta:
        model = PerformanceReview
        fields = [
            "overall_rating",
            "technical_rating", "communication_rating", "ownership_rating", "teamwork_rating",
            "key_achievements", "strengths", "areas_for_improvement",
            "goals_next_period", "manager_comments",
        ]
        widgets = {
            "overall_rating": forms.Select(attrs={"class": SELECT}),
            "technical_rating": forms.Select(attrs={"class": SELECT}),
            "communication_rating": forms.Select(attrs={"class": SELECT}),
            "ownership_rating": forms.Select(attrs={"class": SELECT}),
            "teamwork_rating": forms.Select(attrs={"class": SELECT}),
            "key_achievements": forms.Textarea(attrs={"class": TEXTAREA, "rows": 3,
                                                       "placeholder": "Major wins, completed projects, impact delivered..."}),
            "strengths": forms.Textarea(attrs={"class": TEXTAREA, "rows": 3,
                                                "placeholder": "What does this person consistently do well?"}),
            "areas_for_improvement": forms.Textarea(attrs={"class": TEXTAREA, "rows": 3,
                                                            "placeholder": "Where should they focus on growing?"}),
            "goals_next_period": forms.Textarea(attrs={"class": TEXTAREA, "rows": 3,
                                                        "placeholder": "Top 3-5 goals for the next cycle"}),
            "manager_comments": forms.Textarea(attrs={"class": TEXTAREA, "rows": 3,
                                                       "placeholder": "Anything else worth noting"}),
        }


class EmployeeAcknowledgementForm(forms.ModelForm):
    """Employee response form after manager submits review."""
    class Meta:
        model = PerformanceReview
        fields = ["employee_comments"]
        widgets = {
            "employee_comments": forms.Textarea(attrs={"class": TEXTAREA, "rows": 4,
                                                        "placeholder": "Your reflections, agreement / disagreement, or any additional context..."}),
        }
