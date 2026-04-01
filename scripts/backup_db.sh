#!/bin/bash

# ---- CONFIG ----
CONTAINER_NAME="phone-booths-dashboard-db-1"
DB_NAME="meavo"
DB_USER="meavo"
BACKUP_DIR="/root/db_backups"
LOG_FILE="/root/db_backups/backup.log"
DATE=$(date +"%Y-%m-%d_%H-%M-%S")

DOCKER_BIN="/usr/bin/docker"   # <-- important for cron

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting backup..." >> "$LOG_FILE"

# ---- BACKUP ----
$DOCKER_BIN exec "$CONTAINER_NAME" \
    pg_dump -U "$DB_USER" -F c "$DB_NAME" \
    > "$BACKUP_DIR/db_$DATE.dump"

# ---- RESULT CHECK ----
if [ $? -eq 0 ]; then
    echo "[$(date)] Backup SUCCESS: db_$DATE.dump" >> "$LOG_FILE"
else
    echo "[$(date)] Backup FAILED" >> "$LOG_FILE"
    exit 1
fi

# ---- CLEANUP (keep last 7 days, ONLY .dump files) ----
find "$BACKUP_DIR" -type f -name "*.dump" -mtime +7 -delete

echo "[$(date)] Cleanup completed." >> "$LOG_FILE"
echo "----------------------------------------" >> "$LOG_FILE"