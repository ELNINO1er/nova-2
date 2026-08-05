#!/usr/bin/env sh
set -eu

PROJECT_DIR="${NOVA_PROJECT_DIR:-/opt/nova}"
cd "$PROJECT_DIR"

git pull --ff-only origin main
docker compose config --quiet
docker compose build --pull
docker compose up -d --remove-orphans
docker compose ps

