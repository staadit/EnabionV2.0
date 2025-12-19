#!/usr/bin/env bash
set -euo pipefail

# enabion-deploy-prod.sh <ref> <mode>
# ref: git ref (branch or tag), default main
# mode: start|stop|restart (default start)
# Runs pilot-mode prod stack from infra/docker-compose.prod.pilot.yml

REF="${1:-main}"
MODE="${2:-start}"
COMPOSE="infra/docker-compose.prod.pilot.yml"
ROOT="/srv/enabion/prod/repo"

export COMPOSE_PROJECT_NAME="enabion_pilot"

cd "$ROOT"
git fetch --all --tags
git checkout "$REF"
git reset --hard "$REF"

case "$MODE" in
  stop)
    docker compose -f "$COMPOSE" down
    exit 0
    ;;
  restart)
    docker compose -f "$COMPOSE" down || true
    docker compose -f "$COMPOSE" up -d --build
    ;;
  start)
    docker compose -f "$COMPOSE" up -d --build
    ;;
  *)
    echo "Unknown mode: $MODE (expected start|stop|restart)" >&2
    exit 1
    ;;
esac
