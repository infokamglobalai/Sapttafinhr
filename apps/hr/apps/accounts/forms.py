from django import forms
from django.contrib.auth import authenticate
from django.contrib.auth.forms import PasswordChangeForm as BasePasswordChangeForm


class LoginForm(forms.Form):
    email = forms.EmailField(
        widget=forms.EmailInput(attrs={
            "class": "input input-bordered w-full",
            "placeholder": "you@company.com",
            "autofocus": True,
        })
    )
    password = forms.CharField(
        widget=forms.PasswordInput(attrs={
            "class": "input input-bordered w-full",
            "placeholder": "Password",
        })
    )
    remember_me = forms.BooleanField(required=False)

    def __init__(self, request=None, *args, **kwargs):
        self.request = request
        self._user = None
        super().__init__(*args, **kwargs)

    def clean(self):
        cleaned = super().clean()
        email = cleaned.get("email")
        password = cleaned.get("password")

        if email and password:
            self._user = authenticate(
                self.request, username=email, password=password
            )
            if self._user is None:
                raise forms.ValidationError("Invalid email or password.")
            if not self._user.is_active:
                raise forms.ValidationError("Your account has been deactivated.")
        return cleaned

    def get_user(self):
        return self._user


class SetPasswordForm(forms.Form):
    """Used for first-login password set and password reset."""
    password1 = forms.CharField(
        label="New password",
        widget=forms.PasswordInput(attrs={"class": "input input-bordered w-full"}),
        min_length=8,
    )
    password2 = forms.CharField(
        label="Confirm password",
        widget=forms.PasswordInput(attrs={"class": "input input-bordered w-full"}),
    )

    def clean(self):
        cleaned = super().clean()
        p1 = cleaned.get("password1")
        p2 = cleaned.get("password2")
        if p1 and p2 and p1 != p2:
            raise forms.ValidationError("Passwords do not match.")
        return cleaned
