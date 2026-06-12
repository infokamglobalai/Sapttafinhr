# HRMS — Local Setup & Deployment Guide

## Local Development (Windows / Mac / Linux)

### 1. Prerequisites
- Python 3.12+
- PostgreSQL 16
- Redis 7+
- Node.js (optional, for future Tailwind compilation)

### 2. Clone and install

```bash
cd apps/hr
python -m venv venv
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

pip install -r requirements.txt
```

### 3. Configure environment

```bash
cp .env.example .env
# Edit .env with your local DB and Redis credentials
```

Minimum dev `.env`:
```
DJANGO_SETTINGS_MODULE=hrms.settings.development
SECRET_KEY=dev-secret-key-change-in-production
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
DB_NAME=hrms_dev
DB_USER=postgres
DB_PASSWORD=your-local-pg-password
DB_HOST=localhost
DB_PORT=5432
REDIS_URL=redis://localhost:6379/0
FIELD_ENCRYPTION_KEY=<generate with command below>
SUPERADMIN_DOMAIN=localhost
TENANT_DOMAIN=localhost
```

Generate encryption key:
```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

### 4. Database setup

```bash
# Create the database first
createdb hrms_dev   # or use pgAdmin

python manage.py makemigrations tenants accounts employees attendance leaves payroll hr_ops recruitment
python manage.py migrate
python manage.py seed_permissions
```

### 5. Create first tenant

```bash
python manage.py create_tenant
# Follow prompts: company name, subdomain, admin email, password
```

### 6. Run servers

Terminal 1 — Django:
```bash
python manage.py runserver
```

Terminal 2 — Celery worker:
```bash
celery -A hrms worker -l info
```

Terminal 3 — Celery beat (scheduled tasks):
```bash
celery -A hrms beat -l info
```

### 7. Access

For local testing without subdomain DNS, add to your hosts file:
```
127.0.0.1  acmecorp.localhost
```
Then visit: http://acmecorp.localhost:8000

---

## Production Deployment (DigitalOcean)

### Infrastructure checklist

| Resource | Spec | Monthly Cost |
|----------|------|-------------|
| Droplet | 2 vCPU / 4GB / Bangalore | ~$24 |
| Managed PostgreSQL | Basic, 1GB | ~$15 |
| Managed Redis | Basic | ~$15 |
| Spaces + CDN | 250GB transfer | ~$5 |
| **Total** | | **~₹5,000/month** |

### Deployment steps

1. **Provision droplet** — Ubuntu 22.04 LTS
2. **Install system deps**:
   ```bash
   apt update && apt install -y nginx supervisor python3-pip libpango-1.0-0 libpangoft2-1.0-0 libgdk-pixbuf2.0-0 libcairo2 libpq-dev
   ```
3. **Clone repo** to `/app/hrms`
4. **Create virtualenv** and `pip install -r requirements.txt`
5. **Configure `.env`** with production values
6. **Run migrations**: `python manage.py migrate && python manage.py seed_permissions`
7. **Collect static**: `python manage.py collectstatic --noinput`
8. **Configure Nginx** using `nginx/nginx.conf`
9. **Configure Supervisor** for Gunicorn and Celery workers:
   ```ini
   [program:hrms_web]
   command=/app/hrms/venv/bin/gunicorn hrms.wsgi:application --bind 127.0.0.1:8000 --workers 4
   directory=/app/hrms
   user=www-data
   autostart=true
   autorestart=true

   [program:hrms_celery]
   command=/app/hrms/venv/bin/celery -A hrms worker -l info -c 2
   directory=/app/hrms
   user=www-data
   autostart=true
   autorestart=true

   [program:hrms_beat]
   command=/app/hrms/venv/bin/celery -A hrms beat -l info
   directory=/app/hrms
   user=www-data
   autostart=true
   autorestart=true
   ```
10. **Cloudflare DNS**: Add wildcard CNAME `*.yourbrand.com → your-droplet-ip`
11. **SSL**: Use Cloudflare "Full (strict)" SSL or Let's Encrypt + certbot

### Celery Beat Schedules (set in Django admin → Periodic Tasks)

| Task | Schedule | Purpose |
|------|----------|---------|
| `process_yesterday_attendance` | Daily 00:30 IST | Process all attendance |
| `compute_monthly_summaries` | 1st of month 01:00 IST | Monthly LOP roll-up |

---

## Post-launch checklist

- [ ] First tenant created (`python manage.py create_tenant`)
- [ ] Permissions seeded (`python manage.py seed_permissions`)
- [ ] Default leave types configured in admin
- [ ] Holiday calendar created for current year
- [ ] At least one shift configured
- [ ] Default onboarding template created
- [ ] Celery beat schedules created in Django admin
- [ ] Sentry DSN set in `.env`
- [ ] UptimeRobot ping monitor added
- [ ] DigitalOcean managed backups enabled on PostgreSQL
