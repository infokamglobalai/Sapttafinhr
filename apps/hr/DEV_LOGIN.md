# HR Saptta — local demo login

## Create / refresh demo account

```powershell
cd "hr saptta"
$env:DJANGO_SETTINGS_MODULE = "hrms.settings.development"
.\venv\Scripts\activate
python manage.py seed_dummy_login
```

Reset password if the user already exists:

```powershell
python manage.py seed_dummy_login --reset-password
```

## Default credentials

| Field | Value |
|-------|--------|
| **Email** | `admin@saptta.local` |
| **Password** | `Saptta@12345` |
| **Company** | Saptta Demo Company |
| **Subdomain** | `sapttadev` |

## Login URLs

1. **Recommended:** http://sapttadev.localhost:8001/auth/login/
2. **Also works:** http://localhost:8001/auth/login/ (development mode)

## Run server

```powershell
$env:DJANGO_SETTINGS_MODULE = "hrms.settings.development"
python manage.py runserver 127.0.0.1:8001
```

Django admin (platform): http://localhost:8001/superadmin/ — create with `python manage.py createsuperuser` (no tenant).
