#!/bin/bash

# ---- CONFIG ----
CONTAINER_NAME="phone-booths-dashboard-db-1"
DB_NAME="meavo"
DB_USER="meavo"
BACKUP_DIR="/root/db_backups"
DATE=$(date +"%Y-%m-%d_%H-%M-%S")

mkdir -p $BACKUP_DIR

# ---- BACKUP ----
docker exec $CONTAINER_NAME pg_dump -U $DB_USER -F c $DB_NAME > "$BACKUP_DIR/db_$DATE.dump"

# ---- CLEANUP (keep last 7 days)
find $BACKUP_DIR -type f -mtime +7 -delete