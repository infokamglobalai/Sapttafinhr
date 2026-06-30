import pytest
from django.core.exceptions import ValidationError
from django.urls import reverse
from rest_framework import status
from apps.identity.models import User


@pytest.mark.django_db
def test_demo_user_password_lock():
    # 1. Initial creation of demo user should succeed
    demo = User.objects.create_user(
        email="demo@saptta.com",
        password="demo12345",
        full_name="Demo User"
    )
    assert demo.email == "demo@saptta.com"

    # 2. Saving the user without changing password should succeed
    demo.full_name = "Demo Admin Updated"
    demo.save()
    assert demo.full_name == "Demo Admin Updated"

    # 3. Attempting to change password should raise ValidationError
    demo.set_password("newpassword123")
    with pytest.raises(ValidationError) as excinfo:
        demo.save()
    assert "Password changes are disabled for the demo account" in str(excinfo.value)


@pytest.mark.django_db
def test_normal_user_can_change_password():
    # Regular user should be able to change password without errors
    user = User.objects.create_user(
        email="regular@saptta.com",
        password="oldpassword",
        full_name="Regular User"
    )
    user.set_password("newpassword")
    user.save()  # Should succeed


@pytest.mark.django_db
def test_demo_login_endpoint(client):
    # Ensure demo user is provisioned
    User.objects.create_user(
        email="demo@saptta.com",
        password="demo12345",
        full_name="Demo Admin"
    )
    
    url = reverse("demo_login")
    response = client.post(url)
    assert response.status_code == status.HTTP_200_OK
    assert response.data["workspace"] == "demo"
    assert "access" in response.data
    assert "refresh" in response.data
    assert response.data["user"]["email"] == "demo@saptta.com"
