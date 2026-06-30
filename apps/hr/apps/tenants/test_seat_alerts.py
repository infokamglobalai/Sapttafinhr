"""Seat-limit alert and notification tests."""
import datetime

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings

from apps.accounts.models import Permission
from apps.employees.models import Employee
from apps.employees.services import create_employee
from apps.hr_ops.exit_services import finalize_exit
from apps.hr_ops.models import ExitRequest, Notification
from apps.tenants.limits import seats_remaining
from apps.tenants.seat_alerts import (
    NOTIF_FREED,
    NOTIF_REACHED,
    NOTIF_WARNING,
    notify_owners_add_blocked,
    seat_alert_level,
    sync_seat_limit_alerts,
)
from apps.tenants.services import provision_tenant

User = get_user_model()


class SeatAlertTest(TestCase):
    @classmethod
    def setUpTestData(cls):
        Permission.objects.get_or_create(
            codename="employees.view",
            defaults={"name": "View employees", "module": "employees"},
        )
        cls.tenant, cls.owner = provision_tenant(
            company_name="Seat Alert Co",
            subdomain="seatalert",
            admin_email="owner@seatalert.com",
            admin_password="Owner@1234",
        )

    def _active_employee(self, suffix: str) -> Employee:
        return create_employee(
            self.tenant,
            {
                "first_name": "Emp",
                "last_name": suffix,
                "official_email": f"emp{suffix}@seatalert.com",
                "date_of_joining": datetime.date.today(),
                "employment_status": "active",
            },
        )[0]

    def test_seat_alert_level_critical_at_cap(self):
        # Owner profile counts as one active seat.
        self.tenant.max_employees = 1
        self.tenant.save(update_fields=["max_employees"])
        self.assertEqual(seat_alert_level(self.tenant), "critical")
        self.assertEqual(seats_remaining(self.tenant), 0)

    def test_seat_alert_level_warning_near_cap(self):
        self.tenant.max_employees = 11
        self.tenant.save(update_fields=["max_employees"])
        for i in range(8):
            self._active_employee(str(i))
        self.assertEqual(seat_alert_level(self.tenant), "warning")

    @override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
    def test_notify_owners_when_limit_reached(self):
        self.tenant.max_employees = 1
        self.tenant.save(update_fields=["max_employees"])
        sync_seat_limit_alerts(self.tenant)
        self.assertTrue(
            Notification.objects.filter(
                recipient=self.owner,
                notification_type=NOTIF_REACHED,
            ).exists()
        )

    @override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
    def test_notify_owners_when_seat_freed_after_exit(self):
        self.tenant.max_employees = 2
        self.tenant.save(update_fields=["max_employees"])
        emp = self._active_employee("exit")
        exit_req = ExitRequest.objects.create(
            tenant=self.tenant,
            employee=emp,
            resignation_date=datetime.date.today(),
            last_working_date=datetime.date.today(),
        )
        emp.employment_status = "notice_period"
        emp.save(update_fields=["employment_status"])

        finalize_exit(exit_req, actor=self.owner, disable_login=False)

        self.assertEqual(seats_remaining(self.tenant), 1)
        self.assertTrue(
            Notification.objects.filter(
                recipient=self.owner,
                notification_type=NOTIF_FREED,
            ).exists()
        )

    @override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
    def test_warning_notification_at_ninety_percent(self):
        self.tenant.max_employees = 11
        self.tenant.save(update_fields=["max_employees"])
        for i in range(9):
            self._active_employee(f"nine{i}")
        sync_seat_limit_alerts(self.tenant)
        self.assertTrue(
            Notification.objects.filter(
                recipient=self.owner,
                notification_type=NOTIF_WARNING,
            ).exists()
        )

    @override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
    def test_blocked_add_notifies_urgently(self):
        self.tenant.max_employees = 1
        self.tenant.save(update_fields=["max_employees"])
        notify_owners_add_blocked(self.tenant)
        self.assertEqual(
            Notification.objects.filter(
                recipient=self.owner,
                notification_type=NOTIF_REACHED,
            ).count(),
            1,
        )
