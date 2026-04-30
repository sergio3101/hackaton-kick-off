#!/usr/bin/env bash
# Обёртка над reset_demo.sql: гонит TRUNCATE через docker compose exec.
# Использование (из корня репозитория):
#   bash backend/scripts/reset_demo.sh
# Опции:
#   --service NAME   имя сервиса БД в docker-compose (по умолчанию: db)
#   -y, --yes        не спрашивать подтверждение

set -euo pipefail

SERVICE="db"
YES=0

while [[ $# -gt 0 ]]; do
    case "$1" in
        --service) SERVICE="$2"; shift 2 ;;
        -y|--yes) YES=1; shift ;;
        -h|--help)
            sed -n '2,9p' "$0"
            exit 0
            ;;
        *) echo "Unknown arg: $1" >&2; exit 2 ;;
    esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SQL_FILE="$SCRIPT_DIR/reset_demo.sql"

if [[ ! -f "$SQL_FILE" ]]; then
    echo "SQL file not found: $SQL_FILE" >&2
    exit 1
fi

# Берём креды из .env, если он есть, иначе из окружения, иначе дефолты.
ENV_FILE=""
for candidate in ".env" "../.env" "../../.env"; do
    if [[ -f "$candidate" ]]; then ENV_FILE="$candidate"; break; fi
done
if [[ -n "$ENV_FILE" ]]; then
    set -a
    # shellcheck disable=SC1090
    source "$ENV_FILE"
    set +a
fi

PG_USER="${POSTGRES_USER:-kickoff}"
PG_DB="${POSTGRES_DB:-kickoff}"

if [[ "$YES" -ne 1 ]]; then
    echo "Reset will TRUNCATE all data except 'users' and 'alembic_version' in '$PG_DB' (service '$SERVICE')."
    read -r -p "Continue? [y/N] " ans
    case "$ans" in
        y|Y|yes|YES) ;;
        *) echo "Cancelled."; exit 0 ;;
    esac
fi

docker compose exec -T "$SERVICE" \
    psql -U "$PG_USER" -d "$PG_DB" -v ON_ERROR_STOP=1 \
    < "$SQL_FILE"
