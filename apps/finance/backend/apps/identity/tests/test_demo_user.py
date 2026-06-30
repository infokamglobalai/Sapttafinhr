import pytest

from apps.identity.models import User


@pytest.mark.django_db
def test_normal_user_can_change_password():
    user = User.objects.create_user(
        email="regular@saptta.com",
        password="oldpassword",
        full_name="Regular User",
    )
    user.set_password("newpassword")
    user.save()
