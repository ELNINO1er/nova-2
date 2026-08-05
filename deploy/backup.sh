#!/usr/bin/env sh
set -eu

PROJECT_DIR="${NOVA_PROJECT_DIR:-/opt/nova}"
BACKUP_DIR="${NOVA_BACKUP_DIR:-/opt/backups/nova}"
RETENTION_DAYS="${NOVA_BACKUP_RETENTION_DAYS:-14}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"

mkdir -p "$BACKUP_DIR"
cd "$PROJECT_DIR"

docker compose exec -T nova-db sh -c \
  'exec mysqldump --single-transaction --quick --lock-tables=false -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"' \
  | gzip -9 > "$BACKUP_DIR/nova-$STAMP.sql.gz"

find "$BACKUP_DIR" -type f -name 'nova-*.sql.gz' -mtime "+$RETENTION_DAYS" -delete
echo "Sauvegarde créée: $BACKUP_DIR/nova-$STAMP.sql.gz"
