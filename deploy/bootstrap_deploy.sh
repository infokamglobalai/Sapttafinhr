#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────
# Saptta Production Bootstrap Script
# Run this on your Hostinger VPS after running:
#   docker compose -f docker-compose.prod.yml up -d --build
# Or after starting the stack via Coolify.
# ─────────────────────────────────────────────────────────────────────────

set -e

# Help / Usage info
show_help() {
    echo "Usage: ./bootstrap_deploy.sh [options]"
    echo ""
    echo "Options:"
    echo "  --domain       Your production domain name (e.g., yourdomain.com) [REQUIRED]"
    echo "  --company      Company name (default: 'Acme Pvt Ltd')"
    echo "  --subdomain    Admin tenant subdomain (default: 'acme')"
    echo "  --email        HR/Finance Admin email (default: 'demo@yourdomain.com')"
    echo "  --password     HR/Finance Admin password (default: 'Demo@1234')"
    echo "  -h, --help     Show this help message"
}

DOMAIN=""
COMPANY="Acme Pvt Ltd"
SUBDOMAIN="acme"
EMAIL=""
PASSWORD="Demo@1234"

# Parse arguments
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --domain) DOMAIN="$2"; shift ;;
        --company) COMPANY="$2"; shift ;;
        --subdomain) SUBDOMAIN="$2"; shift ;;
        --email) EMAIL="$2"; shift ;;
        --password) PASSWORD="$2"; shift ;;
        -h|--help) show_help; exit 0 ;;
        *) echo "Unknown parameter: $1"; show_help; exit 1 ;;
    esac
    shift
done

# Validate inputs
if [ -z "$DOMAIN" ]; then
    echo "Error: --domain is required."
    show_help
    exit 1
fi

if [ -z "$EMAIL" ]; then
    if [ "$SUBDOMAIN" = "acme" ]; then
        EMAIL="demo@saptta.com"
    elif [ "$SUBDOMAIN" = "kuwait" ] || [ "$SUBDOMAIN" = "kuwit" ]; then
        EMAIL="kuwit@saptta.com"
    else
        EMAIL="demo@$DOMAIN"
    fi
fi

echo "=========================================================="
echo " Starting Saptta Production Bootstrap on VPS"
echo "=========================================================="
echo " Domain:      $DOMAIN"
echo " Company:     $COMPANY"
echo " Subdomain:   $SUBDOMAIN.$DOMAIN"
echo " Admin Email: $EMAIL"
echo "=========================================================="
echo ""

# Helper to check if docker-compose or docker compose is installed and running
if command -v docker-compose &>/dev/null; then
    DOCKER_COMPOSE_CMD="docker-compose"
elif docker compose version &>/dev/null; then
    DOCKER_COMPOSE_CMD="docker compose"
else
    echo "Error: Neither 'docker-compose' nor 'docker compose' commands were found."
    echo "Please ensure Docker Compose is installed and running."
    exit 1
fi

echo "--> Checking if backend containers are running..."
FIN_RUNNING=$($DOCKER_COMPOSE_CMD ps --format '{{.Names}}' | grep "fin-backend" || true)
HR_RUNNING=$($DOCKER_COMPOSE_CMD ps --format '{{.Names}}' | grep "hr-backend" || true)

if [ -z "$FIN_RUNNING" ] || [ -z "$HR_RUNNING" ]; then
    echo "Warning: Containers do not appear to be running or named default."
    echo "We will attempt running commands using standard service names."
fi

echo "--> 1. Bootstrapping Finance platform & tenant schema..."
$DOCKER_COMPOSE_CMD exec fin-backend python manage.py bootstrap_prod --domain "$DOMAIN"

echo "--> 2. Seeding HR roles & permissions..."
$DOCKER_COMPOSE_CMD exec hr-backend python manage.py seed_permissions

echo "--> 3. Creating HR tenant & admin user..."
$DOCKER_COMPOSE_CMD exec hr-backend python manage.py create_tenant \
  --name "$COMPANY" \
  --subdomain "$SUBDOMAIN" \
  --email "$EMAIL" \
  --password "$PASSWORD"

echo ""
echo "=========================================================="
echo " Seeding completed successfully!"
echo "=========================================================="
echo " Public app:   https://app.$DOMAIN"
echo " Finance workspace: https://$SUBDOMAIN.$DOMAIN"
echo " HRMS portal:      https://hr.$DOMAIN"
echo ""
echo " Admin Credentials:"
echo "   Email:    $EMAIL"
echo "   Password: $PASSWORD"
echo "=========================================================="
