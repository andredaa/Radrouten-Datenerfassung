#!/bin/bash
# Database Restore Script for BAC Kartierung
# Restores a database backup to the PostGIS container

set -e  # Exit on error

# Load environment variables from .env file if it exists
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

# Configuration
CONTAINER_NAME="bac-karierung-db"

# Check if backup file is provided
if [ -z "$1" ]; then
    echo "Usage: ./restore_database.sh <backup_file.sql.gz>"
    echo ""
    echo "Available backups:"
    ls -lh ./backups/kartierung_backup_*.sql.gz 2>/dev/null || echo "  No backups found in ./backups/"
    exit 1
fi

BACKUP_FILE="$1"

# Check if backup file exists
if [ ! -f "${BACKUP_FILE}" ]; then
    echo "Error: Backup file '${BACKUP_FILE}' not found!"
    exit 1
fi

echo "⚠️  WARNING: This will DROP and recreate the database '${POSTGIS_DB}'!"
echo "Container: ${CONTAINER_NAME}"
echo "Database: ${POSTGIS_DB}"
echo "Backup file: ${BACKUP_FILE}"
echo ""
read -p "Are you sure you want to continue? (yes/no): " -r
if [[ ! $REPLY =~ ^yes$ ]]; then
    echo "Restore cancelled."
    exit 0
fi

echo ""
echo "Starting database restore..."

# Wait for database to be ready
echo "Checking if database is ready..."
docker exec "${CONTAINER_NAME}" pg_isready -U "${POSTGIS_USER}" -d "${POSTGIS_DB}" || {
    echo "Error: Database is not ready. Make sure the container is running."
    exit 1
}

# Drop and recreate database (careful!)
echo "Dropping existing database..."
docker exec "${CONTAINER_NAME}" psql -U "${POSTGIS_USER}" -c "DROP DATABASE IF EXISTS ${POSTGIS_DB};"

echo "Creating fresh database..."
docker exec "${CONTAINER_NAME}" psql -U "${POSTGIS_USER}" -c "CREATE DATABASE ${POSTGIS_DB};"

# Enable PostGIS extension
echo "Enabling PostGIS extension..."
docker exec "${CONTAINER_NAME}" psql -U "${POSTGIS_USER}" -d "${POSTGIS_DB}" -c "CREATE EXTENSION IF NOT EXISTS postgis;"

# Restore the backup
echo "Restoring backup..."
gunzip < "${BACKUP_FILE}" | docker exec -i "${CONTAINER_NAME}" psql -U "${POSTGIS_USER}" -d "${POSTGIS_DB}"

echo ""
echo "✓ Database restore completed successfully!"
echo ""
echo "Verifying tables..."
docker exec "${CONTAINER_NAME}" psql -U "${POSTGIS_USER}" -d "${POSTGIS_DB}" -c "\dt"
