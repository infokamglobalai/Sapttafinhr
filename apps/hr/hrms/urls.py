from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path("superadmin/", admin.site.urls),
    path("auth/", include("apps.accounts.urls", namespace="accounts")),
    path("", include("apps.tenants.urls", namespace="tenants")),
    path("employees/", include("apps.employees.urls", namespace="employees")),
    path("attendance/", include("apps.attendance.urls", namespace="attendance")),
    path("leaves/", include("apps.leaves.urls", namespace="leaves")),
    path("payroll/", include("apps.payroll.urls", namespace="payroll")),
    path("hr/", include("apps.hr_ops.urls", namespace="hr_ops")),
    path("performance/", include("apps.performance.urls", namespace="performance")),
]

if settings.DEBUG:
    import debug_toolbar
    urlpatterns = [path("__debug__/", include(debug_toolbar.urls))] + urlpatterns
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
