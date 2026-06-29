# Saptta HR Mobile (Expo / React Native)

Native Android companion for Saptta HRMS — geofence punch, leave, payslips, notifications, and manager approvals.

## Prerequisites

1. **Backend running** (Docker recommended):

```powershell
cd c:\Users\user\Desktop\Sapttafinhr
docker compose up --build
```

2. **Demo data** (if not already seeded):

```bash
docker compose exec hr-backend python manage.py seed_demo_data --subdomain acme
```

3. **Android Studio** with an emulator, or a physical Android device with [Expo Go](https://expo.dev/go).

## Configure API URL

Copy `.env.example` to `.env` and set your machine address:

| Environment | `EXPO_PUBLIC_API_BASE_URL` |
|-------------|---------------------------|
| Android emulator | `http://10.0.2.2:8080` |
| Physical device (same Wi‑Fi) | `http://<your-pc-ip>:8080` |
| iOS simulator | `http://localhost:8080` |

## Run in development

```powershell
cd apps\mobile
npm install
npm run android
```

Or start Metro and scan the QR code with Expo Go:

```powershell
npm start
```

## Demo login

| Field | Value |
|-------|-------|
| Workspace | `acme` |
| Email | `manju@saptta.com` |
| Password | `Employee@1234` |

Manager demo: `manager@saptta.com` / `Demo@1234`

> MFA is disabled in HR dev settings. In production, complete TOTP on the MFA screen after login.

## Build release APK / AAB

```powershell
npm install -g eas-cli
eas login
eas build:configure
eas build -p android --profile preview   # APK for testing
eas build -p android --profile production  # AAB for Play Store
```

## API surface

Auth (FIN public API):

- `POST /api/v1/auth/hr-staff-login/` with `{ client: "mobile", workspace, email, password }`
- `POST /api/v1/auth/hr-staff-login/mfa/` after MFA challenge

HR mobile API (Bearer token):

| Endpoint | Description |
|----------|-------------|
| `GET /api/mobile/v1/me/` | Profile + roles |
| `GET/POST /api/mobile/v1/attendance/*` | Punch + history |
| `GET/POST /api/mobile/v1/leaves/*` | Balances + requests |
| `GET /api/mobile/v1/payslips/` | Published payslips |
| `GET /api/mobile/v1/notifications/` | In-app alerts |
| `GET/POST /api/mobile/v1/approvals/leaves/` | Manager actions |

Backend code: `apps/hr/apps/mobile_api/`

## Geofence setup

HR admin must configure office locations with GPS coordinates and radius before mobile punch validates inside the fence.
