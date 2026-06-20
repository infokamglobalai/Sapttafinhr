#Requires -Version 5.1
<#
.SYNOPSIS
  Run all automated tests for Saptta (HR + Finance backends, optional frontends & E2E).

.DESCRIPTION
  From repo root:
    .\scripts\test-all.ps1
    .\scripts\test-all.ps1 -IncludeBuild
    .\scripts\test-all.ps1 -IncludeE2E

  Requires Docker Desktop (uses docker compose exec against running containers).
  Starts db / redis / hr-backend / fin-backend automatically if they are down.
#>
[CmdletBinding()]
param(
    [switch]$IncludeBuild,
    [switch]$IncludeE2E,
    [switch]$IncludeSmokeLogins,
    [switch]$SkipHr,
    [switch]$SkipFin
)

$ErrorActionPreference = "Stop"
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $Root

$script:Failures = @()

function Write-Header([string]$Text) {
    Write-Host ""
    Write-Host "== $Text ==" -ForegroundColor Cyan
}

function Invoke-TestStep {
    param(
        [string]$Name,
        [scriptblock]$Action
    )
    Write-Host "-> $Name" -ForegroundColor DarkGray
    try {
        & $Action
        if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) {
            throw "Exit code $LASTEXITCODE"
        }
        Write-Host "   OK" -ForegroundColor Green
    }
    catch {
        Write-Host "   FAILED: $_" -ForegroundColor Red
        $script:Failures += $Name
    }
}

function Test-CommandExists([string]$Name) {
    return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

function Ensure-ComposeServices {
    param([string[]]$Services)

    foreach ($svc in $Services) {
        $id = docker compose ps $svc --status running -q 2>$null
        if (-not $id) {
            Write-Host "Starting $svc (and dependencies)..." -ForegroundColor Yellow
            docker compose up -d $svc
            if ($LASTEXITCODE -ne 0) {
                throw "docker compose up failed for $svc"
            }
        }
    }

    # Brief pause so Django containers finish migrate/seed on cold start.
    Start-Sleep -Seconds 3
}

if (-not (Test-CommandExists "docker")) {
    Write-Error "Docker is not installed or not on PATH. Install Docker Desktop and retry."
    exit 1
}

Write-Header "Saptta test-all ($Root)"
Write-Host "Flags: IncludeBuild=$IncludeBuild IncludeE2E=$IncludeE2E IncludeSmokeLogins=$IncludeSmokeLogins SkipHr=$SkipHr SkipFin=$SkipFin"

Ensure-ComposeServices @("db", "redis", "hr-backend", "fin-backend")

if (-not $SkipHr) {
    Write-Header "HR backend"
    Invoke-TestStep "HR Django check" {
        docker compose exec -T hr-backend python manage.py check
    }
    Invoke-TestStep "HR migrations in sync" {
        docker compose exec -T hr-backend python manage.py makemigrations --check --dry-run
    }
    Invoke-TestStep "HR unit/integration tests" {
        docker compose exec -T hr-backend python manage.py test --verbosity=1
    }
}

if (-not $SkipFin) {
    Write-Header "Finance backend"
    Invoke-TestStep "FIN Django check" {
        docker compose exec -T fin-backend python manage.py check
    }
    Invoke-TestStep "FIN migrations in sync" {
        docker compose exec -T fin-backend python manage.py makemigrations --check --dry-run
    }
    Invoke-TestStep "FIN pytest" {
        docker compose exec -T fin-backend pytest -q
    }
}

if ($IncludeBuild) {
    Write-Header "Frontend builds"
    Invoke-TestStep "Platform web (tsc + build)" {
        Push-Location (Join-Path $Root "apps\web")
        npm ci --silent
        npx tsc --noEmit
        npm run build
        Pop-Location
    }
    Invoke-TestStep "Finance frontend (tsc + build)" {
        Push-Location (Join-Path $Root "apps\finance\frontend")
        npm ci --silent
        npx tsc --noEmit
        $env:VITE_API_BASE_URL = "/api/v1"
        $env:VITE_PLATFORM_BASE_URL = "http://localhost:8080"
        npm run build
        Pop-Location
    }
}

if ($IncludeSmokeLogins) {
    Write-Header "Login smoke (all roles)"
    Invoke-TestStep "Login paths (owner, staff, SSO, employee)" {
        docker compose run --rm `
            -v "${Root}/scripts:/scripts" `
            -e SMOKE_BASE_URL=http://nginx:80 `
            fin-backend python /scripts/smoke_logins.py
    }
}

if ($IncludeE2E) {
    Write-Header "Playwright E2E (requires nginx on :8080)"
    Ensure-ComposeServices @("nginx", "web", "finance-web")
    Invoke-TestStep "Playwright flow.mjs" {
        Push-Location (Join-Path $Root "e2e")
        if (-not (Test-Path "node_modules")) {
            npm ci --silent
        }
        node flow.mjs
        Pop-Location
    }
}

Write-Header "Summary"
if ($script:Failures.Count -eq 0) {
    Write-Host "All steps passed." -ForegroundColor Green
    exit 0
}

Write-Host "Failed ($($script:Failures.Count)):" -ForegroundColor Red
foreach ($f in $script:Failures) {
    Write-Host "  - $f" -ForegroundColor Red
}
exit 1
