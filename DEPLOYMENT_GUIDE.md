# Saptta VPS Deployment Guide (Hostinger)

This guide walks you through deploying the **Saptta HRMS & Finance SaaS Platform** to a **Hostinger VPS**.

---

## Prerequisites

1. **Hostinger VPS Subscription:** We recommend at least a **KVM 2** plan or above (minimum 2 vCPUs and 4GB RAM) to run the Django servers, Vite React builds, PostgreSQL, and Redis databases.
2. **Domain Name:** Registered domain pointing to Hostinger.
3. **OS Template:** Choose either:
   - **Ubuntu 22.04 with Coolify** (Recommended: simple dashboard UI, auto SSL, auto redeploy).
   - **Ubuntu 22.04 with Docker** (Command-line only).

---

## Step 1: Configure DNS Records

In your Hostinger Client Area, go to **Domains > DNS Zone Editor** and add the following records:

| Type | Host | Points to / Value | TTL | Description |
|------|------|-------------------|-----|-------------|
| **A** | `@` | `<VPS-IP-Address>` | 14400 | Root domain (Marketing landing page) |
| **A** | `www` | `<VPS-IP-Address>` | 14400 | WWW redirect |
| **A** | `app` | `<VPS-IP-Address>` | 14400 | Platform App Shell (Login / Register / Public API) |
| **A** | `hr` | `<VPS-IP-Address>` | 14400 | HRMS Web Portal |
| **A** | `*` | `<VPS-IP-Address>` | 14400 | **Wildcard subdomain** (Crucial for tenant/workspace subdomains!) |

---

## Step 2: Configure Domain & Secrets Locally

Before uploading/pushing code to your server, configure your domain and generate secure production secrets. We have provided a helper script to do this in one command:

1. Open a terminal in the project root.
2. Run the configuration script:
   ```bash
   python deploy/configure_domain.py --domain yourdomain.com
   ```
   *(Replace `yourdomain.com` with your actual registered domain)*

This script automatically:
* Reads `.env.prod.example` and creates `.env.prod` with your domain name.
* Generates secure, randomized cryptographically strong production keys for `FIN_SECRET_KEY`, `HR_SECRET_KEY`, `HR_FIELD_ENCRYPTION_KEY`, and `SSO_SHARED_SECRET`.
* Replaces the domain name `saptta.com` in `deploy/nginx.coolify.conf` and `deploy/nginx.prod.conf`.

---

## Step 3: Deploy the Stack

### Option A: Deployment via Coolify (Recommended)

Coolify provides a web-based dashboard and handles SSL termination and wildcard subdomains automatically.

1. **Log in to Coolify:** Go to `http://<VPS-IP-Address>:3000` and finish the initial setup.
2. **Add a Resource:** Click **Projects > Default > New Resource > Docker Compose**.
3. **Paste Docker Compose:** Paste the contents of `docker-compose.coolify.yml`.
4. **Environment Variables:** Load the environment variables from your newly generated `.env.prod` file.
5. **Domain Setting:** In the Coolify frontend for the `frontdoor` service:
   - Configure the domain to listen to `https://yourdomain.com`.
   - Setup wildcard alias `https://*.yourdomain.com` (Coolify will fetch a wildcard certificate automatically via Let's Encrypt).
6. **Deploy:** Click **Deploy**.

---

### Option B: Manual Docker Compose Deployment

If you are using the standard **Ubuntu with Docker** VPS template:

1. **SSH into your VPS:**
   ```bash
   ssh root@<VPS-IP-Address>
   ```
2. **Clone the repository:**
   ```bash
   git clone <your-repository-url> /opt/saptta
   cd /opt/saptta
   ```
3. **Transfer `.env.prod`:** Copy the `.env.prod` file generated in Step 2 to the `/opt/saptta` directory on the server.
4. **Acquire SSL Certificate:**
   Install Certbot and request a wildcard certificate for your domain:
   ```bash
   sudo apt update && sudo apt install certbot -y
   # Use dns challenge to get a wildcard certificate
   sudo certbot certonly --manual --preferred-challenges=dns -d yourdomain.com -d *.yourdomain.com
   ```
   Follow the certbot prompts to add TXT records in Hostinger DNS. Once succeeded, certs will be located in `/etc/letsencrypt/live/yourdomain.com/`.
5. **Start the containers:**
   ```bash
   docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
   ```

---

## Step 4: Bootstrap the Databases & Tenants

Once all docker services are up and healthy, we need to run database migrations, seed standard subscription plans, generate permissions, and set up your initial workspace.

Run the provided bootstrap script on the VPS:

1. Make the script executable:
   ```bash
   chmod +x deploy/bootstrap_deploy.sh
   ```
2. Run it with your production domain:
   ```bash
   ./deploy/bootstrap_deploy.sh --domain yourdomain.com
   ```

Alternatively, you can customize the first user's credentials and company name:
```bash
./deploy/bootstrap_deploy.sh \
  --domain yourdomain.com \
  --company "Acme Corp" \
  --subdomain acme \
  --email admin@yourdomain.com \
  --password YourSecurePassword123
```

This script will output:
* Public tenant setup success.
* Seeded Indian Chart of Accounts (COA) and complete subscription plans.
* Created Django superuser for administration.
* Seeding HR modules roles & permissions.
* Creating initial HR admin user & tenant workspace link.

---

## Verification

Navigate to your web browser and test the following endpoints:

* **Marketing Landing Page:** `https://yourdomain.com`
* **App login / Registration:** `https://app.yourdomain.com` (Log in with the admin email and password specified during bootstrapping).
* **Finance Workspace:** `https://acme.yourdomain.com` (After logging in, click "Finance" in the product switcher).
* **HRMS App Portal:** `https://hr.yourdomain.com` (After logging in, click "HRMS" in the product switcher).
