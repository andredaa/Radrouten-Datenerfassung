#!/bin/bash
# Database Backup Script for BAC Kartierung
# Creates a timestamped backup of the PostGIS database

set -e  # Exit on error

# Load environment variables from .env file if it exists
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

# Configuration
CONTAINER_NAME="bac-karierung-db"
BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/kartierung_backup_${TIMESTAMP}.sql.gz"

# Create backup directory if it doesn't exist
mkdir -p "${BACKUP_DIR}"

echo "Starting database backup..."
echo "Container: ${CONTAINER_NAME}"
echo "Database: ${POSTGIS_DB}"
echo "Backup file: ${BACKUP_FILE}"

# Create compressed SQL dump
docker exec "${CONTAINER_NAME}" pg_dump \
    -U "${POSTGIS_USER}" \
    -d "${POSTGIS_DB}" \
    --format=plain \
    --no-owner \
    --no-acl \
    | gzip > "${BACKUP_FILE}"

# Get file size
FILESIZE=$(du -h "${BACKUP_FILE}" | cut -f1)

echo "✓ Backup completed successfully!"
echo "  File: ${BACKUP_FILE}"
echo "  Size: ${FILESIZE}"

echo ""
echo "Backup summary:"
ls -lh "${BACKUP_DIR}"/kartierung_backup_*.sql.gz | tail -n 5
