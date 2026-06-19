#!/usr/bin/env bash
# Run all automated tests from repo root (Linux/macOS/WSL).
#   ./scripts/test-all.sh
#   ./scripts/test-all.sh --include-build
#   ./scripts/test-all.sh --include-e2e
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

INCLUDE_BUILD=0
INCLUDE_E2E=0
SKIP_HR=0
SKIP_FIN=0
FAILURES=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --include-build) INCLUDE_BUILD=1 ;;
    --include-e2e)   INCLUDE_E2E=1 ;;
    --skip-hr)       SKIP_HR=1 ;;
    --skip-fin)      SKIP_FIN=1 ;;
    -h|--help)
      echo "Usage: $0 [--include-build] [--include-e2e] [--skip-hr] [--skip-fin]"
      exit 0
      ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
  shift
done

header() { echo; echo "== $1 =="; }
step() {
  local name="$1"
  shift
  echo "-> $name"
  set +e
  "$@"
  local code=$?
  set -e
  if [[ $code -eq 0 ]]; then
    echo "   OK"
  else
    echo "   FAILED (exit $code)"
    FAILURES+=("$name")
  fi
}

ensure_service() {
  local svc="$1"
  if ! docker compose ps "$svc" --status running -q | grep -q .; then
    echo "Starting $svc..."
    docker compose up -d "$svc"
  fi
}

command -v docker >/dev/null || { echo "Docker required"; exit 1; }

header "Saptta test-all ($ROOT)"
ensure_service db
ensure_service redis
ensure_service hr-backend
ensure_service fin-backend
sleep 3

if [[ "$SKIP_HR" -eq 0 ]]; then
  header "HR backend"
  step "HR Django check" \
    docker compose exec -T hr-backend python manage.py check
  step "HR migrations in sync" \
    docker compose exec -T hr-backend python manage.py makemigrations --check --dry-run
  step "HR unit/integration tests" \
    docker compose exec -T hr-backend python manage.py test --verbosity=1
fi

if [[ "$SKIP_FIN" -eq 0 ]]; then
  header "Finance backend"
  step "FIN Django check" \
    docker compose exec -T fin-backend python manage.py check
  step "FIN migrations in sync" \
    docker compose exec -T fin-backend python manage.py makemigrations --check --dry-run
  step "FIN pytest" \
    docker compose exec -T fin-backend pytest -q
fi

if [[ "$INCLUDE_BUILD" -eq 1 ]]; then
  header "Frontend builds"
  step "Platform web (tsc + build)" bash -c "
    cd apps/web && npm ci --silent && npx tsc --noEmit && npm run build
  "
  step "Finance frontend (tsc + build)" bash -c "
    cd apps/finance/frontend && npm ci --silent && npx tsc --noEmit &&
    VITE_API_BASE_URL=/api/v1 VITE_PLATFORM_BASE_URL=http://localhost:8080 npm run build
  "
fi

if [[ "$INCLUDE_E2E" -eq 1 ]]; then
  header "Playwright E2E"
  ensure_service nginx
  ensure_service web
  ensure_service finance-web
  step "Playwright flow.mjs" bash -c "
    cd e2e && (test -d node_modules || npm ci --silent) && node flow.mjs
  "
fi

header "Summary"
if [[ ${#FAILURES[@]} -eq 0 ]]; then
  echo "All steps passed."
  exit 0
fi

echo "Failed (${#FAILURES[@]}):"
printf '  - %s\n' "${FAILURES[@]}"
exit 1
