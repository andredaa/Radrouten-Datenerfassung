# Database Backup & Restore Guide

## Backup Scripts

### backup_database.sh
Creates a compressed SQL dump of the PostGIS database.

**Usage:**
```bash
./backup_database.sh
```

**Features:**
- Creates timestamped backups in `./backups/` directory
- Compresses with gzip to save space
- Automatically keeps only the last 7 backups
- Uses `--no-owner --no-acl` for better portability

**Output:**
- Backup file: `backups/kartierung_backup_YYYYMMDD_HHMMSS.sql.gz`

---

### restore_database.sh
Restores a database backup.

**Usage:**
```bash
./restore_database.sh backups/kartierung_backup_20260602_143025.sql.gz
```

**Features:**
- Drops and recreates the database (⚠️ destructive!)
- Prompts for confirmation before proceeding
- Automatically enables PostGIS extension
- Verifies tables after restore

---

## Migration to Another Server

### Step 1: On the source server (this one)
```bash
# Create a backup
./backup_database.sh

# Copy the backup file to the new server
scp backups/kartierung_backup_20260602_143025.sql.gz user@newserver:/path/to/kartierung_software_server/backups/
```

### Step 2: On the target server
```bash
# Make sure docker-compose is running
docker-compose up -d db

# Wait for database to be ready (check with docker logs)
docker logs bac-karierung-db

# Restore the backup
./restore_database.sh backups/kartierung_backup_20260602_143025.sql.gz

# Restart the backend to ensure clean connections
docker-compose restart backend
```

---

## Alternative: Volume Backup (Full Binary Copy)

If you want to backup the entire PostgreSQL data directory (including all databases, users, etc.):

### Backup Volume
```bash
docker run --rm \
    -v db_data:/data \
    -v $(pwd)/backups:/backup \
    alpine tar czf /backup/db_data_volume_$(date +%Y%m%d_%H%M%S).tar.gz -C /data .
```

### Restore Volume
```bash
# Stop the database first
docker-compose stop db

# Restore the volume
docker run --rm \
    -v db_data:/data \
    -v $(pwd)/backups:/backup \
    alpine sh -c "cd /data && rm -rf * && tar xzf /backup/db_data_volume_TIMESTAMP.tar.gz"

# Start the database
docker-compose up -d db
```

**Note:** Volume backups are faster but less portable between different PostgreSQL versions.

---

## Automated Backups (Cron)

To run backups automatically every day at 2 AM:

```bash
# Edit crontab
crontab -e

# Add this line:
0 2 * * * cd /home/andre/dev/kartierung_software_server && ./backup_database.sh >> ./backups/backup.log 2>&1
```

---

## Troubleshooting

**Database not ready:**
```bash
docker exec bac-karierung-db pg_isready -U postgres
```

**Check database size:**
```bash
docker exec bac-karierung-db psql -U postgres -d your_db -c "SELECT pg_size_pretty(pg_database_size('your_db'));"
```

**List all tables:**
```bash
docker exec bac-karierung-db psql -U postgres -d your_db -c "\dt"
```

**Check backup file contents:**
```bash
gunzip < backups/kartierung_backup_20260602_143025.sql.gz | head -n 50
```
