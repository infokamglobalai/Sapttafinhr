from functools import wraps
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.contrib.auth.mixins import LoginRequiredMixin
from django.core.exceptions import PermissionDenied
from django.shortcuts import redirect


def tenant_required(view_func):
    """
    Decorator: requires authenticated user AND a resolved tenant on the request.
    Redirects platform superusers (no tenant) to the Django admin.
    """
    @wraps(view_func)
    @login_required
    def wrapper(request, *args, **kwargs):
        if not getattr(request, "tenant", None):
            messages.error(request, "This page requires a tenant context. Log in as a tenant user.")
            return redirect("/superadmin/" if request.user.is_superuser else "accounts:login")
        return view_func(request, *args, **kwargs)
    return wrapper


class TenantRequiredMixin(LoginRequiredMixin):
    """Ensures request has a resolved tenant; redirects to login if not authenticated."""

    def dispatch(self, request, *args, **kwargs):
        if not request.user.is_authenticated:
            return self.handle_no_permission()
        if not getattr(request, "tenant", None):
            return redirect("accounts:login")
        return super().dispatch(request, *args, **kwargs)


class PermissionRequiredMixin(TenantRequiredMixin):
    """
    Checks RBAC permission codename before allowing access.

    Usage:
        class MyView(PermissionRequiredMixin, View):
            required_permission = "payroll.run"
    """
    required_permission = None

    def dispatch(self, request, *args, **kwargs):
        result = super().dispatch(request, *args, **kwargs)
        if hasattr(result, "status_code") and result.status_code != 200:
            return result
        if self.required_permission and not request.user.has_perm_code(self.required_permission):
            raise PermissionDenied
        return result
