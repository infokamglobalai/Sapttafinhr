# Local development (monorepo layout)

Repo structure matches GitHub:

```
saptta/
├── apps/web/              ← marketing website + app shell
├── apps/hr/               ← HR backend (Django)
└── apps/finance/          ← Finance backend + frontend
    ├── backend/
    └── frontend/
```

Do **not** use old root folders (`sappta/`, `hr saptta/`, `fin saptta/`) — they were removed.

---

## Website (React)

```powershell
cd "c:\Users\user\Desktop\saptta\apps\web"
npm install
npm run dev
```

Open **http://localhost:5173/**

Optional: copy `apps/web/.env.example` to `apps/web/.env.local` if you need a running Finance API for login.

---

## HR (Django)

```powershell
cd "c:\Users\user\Desktop\saptta\apps\hr"
.\venv\Scripts\activate          # create venv first if missing
$env:DJANGO_SETTINGS_MODULE = "hrms.settings.development"
$env:ALLOWED_HOSTS = "localhost,127.0.0.1,.localhost"
python manage.py migrate
python manage.py seed_dummy_login
python manage.py runserver 127.0.0.1:8001
```

Login: **http://sapttadev.localhost:8001/auth/login/**  
Demo: `admin@saptta.local` / `Saptta@12345` — see [apps/hr/DEV_LOGIN.md](apps/hr/DEV_LOGIN.md)

---

## Finance (Django + React)

Requires PostgreSQL + Redis (see [apps/finance/README.md](apps/finance/README.md)).

**Backend:**

```powershell
cd "c:\Users\user\Desktop\saptta\apps\finance\backend"
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt -r requirements-dev.txt
python manage.py migrate_schemas --shared
python manage.py bootstrap_dev
python manage.py runserver
```

**Frontend (Finance UI only):**

```powershell
cd "c:\Users\user\Desktop\saptta\apps\finance\frontend"
npm install
npm run dev
```

---

## Full stack (website + HR + Finance)

From repo root:

```powershell
cd "c:\Users\user\Desktop\saptta"
cp .env.example .env
docker compose up --build
```

Open **http://localhost:8080** (nginx front door).
