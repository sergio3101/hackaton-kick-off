# Обёртка над reset_demo.sql для Windows / PowerShell.
# Использование (из корня репозитория):
#   powershell -File backend\scripts\reset_demo.ps1
# Опции:
#   -Service NAME   имя сервиса БД в docker-compose (по умолчанию: db)
#   -Yes            не спрашивать подтверждение

[CmdletBinding()]
param(
    [string]$Service = "db",
    [switch]$Yes
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$SqlFile = Join-Path $ScriptDir "reset_demo.sql"

if (-not (Test-Path $SqlFile)) {
    Write-Error "SQL file not found: $SqlFile"
    exit 1
}

# Подтянем креды из .env (ищем в текущей и двух родительских директориях),
# иначе возьмём из окружения, иначе дефолты.
$EnvFile = $null
foreach ($candidate in @(".env", "..\.env", "..\..\.env")) {
    if (Test-Path $candidate) { $EnvFile = $candidate; break }
}
if ($EnvFile) {
    Get-Content $EnvFile | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
            $idx = $line.IndexOf("=")
            $key = $line.Substring(0, $idx).Trim()
            $val = $line.Substring($idx + 1).Trim().Trim('"').Trim("'")
            if ($key -and -not [Environment]::GetEnvironmentVariable($key, "Process")) {
                [Environment]::SetEnvironmentVariable($key, $val, "Process")
            }
        }
    }
}

$PgUser = if ($env:POSTGRES_USER) { $env:POSTGRES_USER } else { "kickoff" }
$PgDb   = if ($env:POSTGRES_DB)   { $env:POSTGRES_DB }   else { "kickoff" }

if (-not $Yes) {
    Write-Host "Reset will TRUNCATE all data except 'users' and 'alembic_version' in '$PgDb' (service '$Service')." -ForegroundColor Yellow
    $ans = Read-Host "Continue? [y/N]"
    if ($ans -notmatch '^(y|Y|yes|YES)$') {
        Write-Host "Cancelled."
        exit 0
    }
}

# docker compose exec -T требует stdin; передаём содержимое SQL через pipeline.
Get-Content -Raw -Path $SqlFile |
    docker compose exec -T $Service psql -U $PgUser -d $PgDb -v ON_ERROR_STOP=1

if ($LASTEXITCODE -ne 0) {
    Write-Error "psql exited with code $LASTEXITCODE"
    exit $LASTEXITCODE
}