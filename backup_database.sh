#!/bin/bash
# Database Backup Script for BAC Kartierung
# Creates a timestamped backup of the PostGIS database

set -e  # Exit on error

# Load environment variables from .env file if it exists
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

# Configuration
KARTIERUNG_CONTAINER="bac-karierung-db"
FORMBRICKS_CONTAINER="formbricks-postgres"
BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
KARTIERUNG_BACKUP_FILE="${BACKUP_DIR}/kartierung_backup_${TIMESTAMP}.sql.gz"
FORMBRICKS_BACKUP_FILE="${BACKUP_DIR}/formbricks_backup_${TIMESTAMP}.sql.gz"

# Create backup directory if it doesn't exist
mkdir -p "${BACKUP_DIR}"

echo "Starting database backups..."
echo "Timestamp: ${TIMESTAMP}"
echo ""

# Backup Kartierung Database
echo "[1/2] Backing up Kartierung database..."
echo "  Container: ${KARTIERUNG_CONTAINER}"
echo "  Database: ${POSTGIS_DB}"
echo "  File: ${KARTIERUNG_BACKUP_FILE}"

docker exec "${KARTIERUNG_CONTAINER}" pg_dump \
    -U "${POSTGIS_USER}" \
    -d "${POSTGIS_DB}" \
    --format=plain \
    --no-owner \
    --no-acl \
    | gzip > "${KARTIERUNG_BACKUP_FILE}"

KARTIERUNG_SIZE=$(du -h "${KARTIERUNG_BACKUP_FILE}" | cut -f1)
echo "  ✓ Kartierung backup completed (${KARTIERUNG_SIZE})"
echo ""

# Backup Formbricks Database
echo "[2/2] Backing up Formbricks database..."
echo "  Container: ${FORMBRICKS_CONTAINER}"
echo "  Database: formbricks"
echo "  File: ${FORMBRICKS_BACKUP_FILE}"

docker exec "${FORMBRICKS_CONTAINER}" pg_dump \
    -U postgres \
    -d formbricks \
    --format=plain \
    --no-owner \
    --no-acl \
    | gzip > "${FORMBRICKS_BACKUP_FILE}"

FORMBRICKS_SIZE=$(du -h "${FORMBRICKS_BACKUP_FILE}" | cut -f1)
echo "  ✓ Formbricks backup completed (${FORMBRICKS_SIZE})"
echo ""

echo "========================================"
echo "✓ All backups completed successfully!"
echo "========================================"
echo "Kartierung: ${KARTIERUNG_BACKUP_FILE} (${KARTIERUNG_SIZE})"
echo "Formbricks: ${FORMBRICKS_BACKUP_FILE} (${FORMBRICKS_SIZE})"
echo ""
echo "Recent backups:"
ls -lh "${BACKUP_DIR}"/*_backup_*.sql.gz | tail -n 10
