# HR Saptta — local demo login

## Create / refresh demo account

```powershell
cd "apps\hr"
$env:DJANGO_SETTINGS_MODULE = "hrms.settings.development"
.\.venv\Scripts\activate
python manage.py seed_dummy_login --subdomain sapttadev --email admin@saptta.local --password Saptta@12345 --name "Kamglobal"
```

Reset passwords if users already exist:

```powershell
python manage.py seed_dummy_login --subdomain sapttadev --email admin@saptta.local --password Saptta@12345 --reset-password
python manage.py seed_dummy_login --reset-employee --employee-email manju@saptta.com --employee-password Employee@1234
```

## Default credentials (sapttadev workspace)

| Role | Email | Password |
|------|--------|----------|
| **HR Admin** | `admin@saptta.local` | `Saptta@12345` |
| **Employee** (Manjunath) | `manju@saptta.com` | `Employee@1234` |
| **Subdomain** | `sapttadev` | |

## Login URLs

1. **Recommended:** http://sapttadev.localhost:8001/auth/login/
2. **Also works:** http://localhost:8001/auth/login/ (development mode)

## Run server

```powershell
$env:DJANGO_SETTINGS_MODULE = "hrms.settings.development"
python manage.py runserver 127.0.0.1:8001
```

Django admin (platform): http://localhost:8001/superadmin/ — create with `python manage.py createsuperuser` (no tenant).

## Comp-off leave

Create a leave type with code **CO** (Comp Off). When an employee applies using that type, available comp-off credits are validated on apply and redeemed automatically on approval.
