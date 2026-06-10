#!/bin/bash
# Database Restore Script for BAC Kartierung
# Restores a database backup to the PostGIS container

set -e  # Exit on error

# Load environment variables from .env file if it exists
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

# Configuration
KARTIERUNG_CONTAINER="bac-karierung-db"
FORMBRICKS_CONTAINER="formbricks-postgres"

# Function to show usage
show_usage() {
    echo "Usage: ./restore_database.sh <timestamp>"
    echo "   or: ./restore_database.sh <kartierung_backup.sql.gz> <formbricks_backup.sql.gz>"
    echo ""
    echo "Available backups (by timestamp):"
    # Group backups by timestamp
    ls ./backups/*_backup_*.sql.gz 2>/dev/null | sed 's/.*_\([0-9]\{8\}_[0-9]\{6\}\).*/\1/' | sort -u | while read ts; do
        echo "  ${ts}:"
        ls -lh ./backups/*_${ts}.sql.gz 2>/dev/null | awk '{print "    " $9 " (" $5 ")"}'
    done
    if [ ! -f ./backups/*_backup_*.sql.gz 2>/dev/null ]; then
        echo "  No backups found in ./backups/"
    fi
}

# Check if arguments are provided
if [ -z "$1" ]; then
    show_usage
    exit 1
fi

# Determine backup files based on input
if [ -z "$2" ]; then
    # Assume $1 is a timestamp
    TIMESTAMP="$1"
    KARTIERUNG_BACKUP="./backups/kartierung_backup_${TIMESTAMP}.sql.gz"
    FORMBRICKS_BACKUP="./backups/formbricks_backup_${TIMESTAMP}.sql.gz"
    echo "Using timestamp: ${TIMESTAMP}"
else
    # Both files provided
    KARTIERUNG_BACKUP="$1"
    FORMBRICKS_BACKUP="$2"
fi

# Check if backup files exist
if [ ! -f "${KARTIERUNG_BACKUP}" ]; then
    echo "Error: Kartierung backup file '${KARTIERUNG_BACKUP}' not found!"
    show_usage
    exit 1
fi

if [ ! -f "${FORMBRICKS_BACKUP}" ]; then
    echo "Error: Formbricks backup file '${FORMBRICKS_BACKUP}' not found!"
    show_usage
    exit 1
fi

echo "⚠️  WARNING: This will DROP and recreate BOTH databases!"
echo ""
echo "Kartierung Database:"
echo "  Container: ${KARTIERUNG_CONTAINER}"
echo "  Database: ${POSTGIS_DB}"
echo "  Backup: ${KARTIERUNG_BACKUP}"
echo ""
echo "Formbricks Database:"
echo "  Container: ${FORMBRICKS_CONTAINER}"
echo "  Database: formbricks"
echo "  Backup: ${FORMBRICKS_BACKUP}"
echo ""
read -p "Are you sure you want to continue? (yes/no): " -r
if [[ ! $REPLY =~ ^yes$ ]]; then
    echo "Restore cancelled."
    exit 0
fi

echo ""
echo "========================================"
echo "Starting database restoration..."
echo "========================================"
echo ""

# === Restore Kartierung Database ===
echo "[1/2] Restoring Kartierung database..."

# Wait for database to be ready
echo "  Checking if database is ready..."
docker exec "${KARTIERUNG_CONTAINER}" pg_isready -U "${POSTGIS_USER}" -d postgres || {
    echo "  Error: Kartierung database is not ready. Make sure the container is running."
    exit 1
}

# Drop and recreate database
echo "  Dropping existing database..."
docker exec "${KARTIERUNG_CONTAINER}" psql -U "${POSTGIS_USER}" -d postgres -c "DROP DATABASE IF EXISTS \"${POSTGIS_DB}\";"

echo "  Creating fresh database..."
docker exec "${KARTIERUNG_CONTAINER}" psql -U "${POSTGIS_USER}" -d postgres -c "CREATE DATABASE \"${POSTGIS_DB}\";"

# Enable PostGIS extension
echo "  Enabling PostGIS extension..."
docker exec "${KARTIERUNG_CONTAINER}" psql -U "${POSTGIS_USER}" -d "${POSTGIS_DB}" -c "CREATE EXTENSION IF NOT EXISTS postgis;"

# Restore the backup
echo "  Restoring backup..."
gunzip < "${KARTIERUNG_BACKUP}" | docker exec -i "${KARTIERUNG_CONTAINER}" psql -U "${POSTGIS_USER}" -d "${POSTGIS_DB}"

echo "  ✓ Kartierung database restored successfully!"
echo ""

# === Restore Formbricks Database ===
echo "[2/2] Restoring Formbricks database..."

# Wait for database to be ready
echo "  Checking if database is ready..."
docker exec "${FORMBRICKS_CONTAINER}" pg_isready -U postgres -d postgres || {
    echo "  Error: Formbricks database is not ready. Make sure the container is running."
    exit 1
}

# Drop and recreate database
echo "  Dropping existing database..."
docker exec "${FORMBRICKS_CONTAINER}" psql -U postgres -c "DROP DATABASE IF EXISTS formbricks;"

echo "  Creating fresh database..."
docker exec "${FORMBRICKS_CONTAINER}" psql -U postgres -c "CREATE DATABASE formbricks;"

# Enable pgvector extension (used by Formbricks)
echo "  Enabling pgvector extension..."
docker exec "${FORMBRICKS_CONTAINER}" psql -U postgres -d formbricks -c "CREATE EXTENSION IF NOT EXISTS vector;"

# Restore the backup
echo "  Restoring backup..."
gunzip < "${FORMBRICKS_BACKUP}" | docker exec -i "${FORMBRICKS_CONTAINER}" psql -U postgres -d formbricks

echo "  ✓ Formbricks database restored successfully!"
echo ""

echo "========================================"
echo "✓ All databases restored successfully!"
echo "========================================"
echo ""
echo "Verifying Kartierung tables..."
docker exec "${KARTIERUNG_CONTAINER}" psql -U "${POSTGIS_USER}" -d "${POSTGIS_DB}" -c "\dt"
echo ""
echo "Verifying Formbricks tables..."
docker exec "${FORMBRICKS_CONTAINER}" psql -U postgres -d formbricks -c "\dt"
