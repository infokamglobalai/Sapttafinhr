from django.contrib import messages
from django.shortcuts import get_object_or_404, redirect, render
from django.views.decorators.http import require_POST

from apps.employees.models import Employee
from utils.access import employee_profile_required, manager_or_hr_required, tenant_login_required

from .celebration_services import (
    celebration_feed_queryset,
    default_message_for_type,
    default_title_for_type,
    notify_company_about_celebration,
    publish_celebration,
)
from .forms import CelebrationPostForm, CelebrationWishForm
from .models import CelebrationPost, CelebrationWish

WISH_EMOJIS = ["🎂", "🎉", "🎊", "🥳", "❤️", "👏", "🙌", "💐", "🌟", "✨", "🎁", "🍰", "🪔", "🚀", "💍", "👶", "🏆", "😊", "🤗", "👍"]


@tenant_login_required
def celebration_feed(request):
    tenant = request.tenant
    posts = celebration_feed_queryset(tenant)[:50]
    can_create = request.user.is_hr_admin or request.user.is_manager
    return render(request, "hr_ops/celebrations.html", {
        "posts": posts,
        "can_create": can_create,
        "type_labels": dict(CelebrationPost.CELEBRATION_TYPES),
    })


@tenant_login_required
def celebration_detail(request, pk):
    tenant = request.tenant
    post = get_object_or_404(
        CelebrationPost.objects.select_related("subject_employee", "created_by"),
        pk=pk,
        tenant=tenant,
        is_published=True,
    )
    wishes = post.wishes.select_related("author").order_by("created_at")
    wish_form = CelebrationWishForm()
    already_wished = wishes.filter(author=request.user).exists()
    can_create = request.user.is_hr_admin or request.user.is_manager
    return render(request, "hr_ops/celebration_detail.html", {
        "post": post,
        "wishes": wishes,
        "wish_form": wish_form,
        "wish_emojis": WISH_EMOJIS,
        "already_wished": already_wished,
        "can_create": can_create,
    })


@manager_or_hr_required
def celebration_create_or_edit(request, pk=None):
    tenant = request.tenant
    post = get_object_or_404(CelebrationPost, pk=pk, tenant=tenant) if pk else None

    initial_employee = request.GET.get("employee")
    initial_type = request.GET.get("type", "birthday")

    if request.method == "POST":
        form = CelebrationPostForm(request.POST, request.FILES, tenant=tenant, instance=post)
        if form.is_valid():
            obj = form.save(commit=False)
            obj.tenant = tenant
            obj.created_by = obj.created_by or request.user
            if not obj.title.strip() and obj.subject_employee:
                obj.title = default_title_for_type(obj.celebration_type, obj.subject_employee)
            obj.save()
            if not post:
                publish_celebration(obj, notify_company=True)
                messages.success(request, "Celebration posted — all team members have been notified.")
            else:
                messages.success(request, "Celebration updated.")
            return redirect("hr_ops:celebration_detail", pk=obj.pk)
    else:
        initial = {}
        if not post:
            emp = None
            if initial_employee:
                emp = Employee.objects.filter(tenant=tenant, pk=initial_employee, is_active=True).first()
            initial_type = initial_type if initial_type in dict(CelebrationPost.CELEBRATION_TYPES) else "birthday"
            initial = {
                "celebration_type": initial_type,
                "subject_employee": emp,
            }
            if emp:
                initial["title"] = default_title_for_type(initial_type, emp)
                initial["message"] = default_message_for_type(initial_type, emp, tenant.name)
        form = CelebrationPostForm(tenant=tenant, instance=post, initial=initial if not post else None)

    return render(request, "hr_ops/celebration_form.html", {
        "form": form,
        "post": post,
        "type_emojis": CelebrationPost.TYPE_EMOJI,
    })


@employee_profile_required
@require_POST
def celebration_wish(request, pk):
    tenant = request.tenant
    post = get_object_or_404(CelebrationPost, pk=pk, tenant=tenant, is_published=True)

    if CelebrationWish.objects.filter(post=post, author=request.user).exists():
        messages.info(request, "You already wished on this celebration.")
        return redirect("hr_ops:celebration_detail", pk=pk)

    form = CelebrationWishForm(request.POST)
    if form.is_valid():
        wish = form.save(commit=False)
        wish.post = post
        wish.author = request.user
        if not wish.message.strip() and not wish.emoji:
            wish.emoji = "🎉"
        wish.save()

        if post.subject_employee and post.subject_employee.user_id:
            from .services import notify
            from django.urls import reverse

            author_name = request.user.get_full_name() or request.user.email
            notify(
                post.subject_employee.user,
                "celebration",
                f"{author_name} sent a wish on your celebration",
                message=wish.display_line[:200],
                action_url=reverse("hr_ops:celebration_detail", args=[post.pk]),
                send_email=False,
            )

        messages.success(request, "Your wish was posted!")
    else:
        messages.error(request, "Please add a message or pick an emoji.")
    return redirect("hr_ops:celebration_detail", pk=pk)
