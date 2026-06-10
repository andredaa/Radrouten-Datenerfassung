# Database Backup & Restore Guide

## Overview

The backup and restore scripts handle **both databases** in the stack:
1. **Kartierung Database** (bac-karierung-db): PostGIS database with mapping data
2. **Formbricks Database** (formbricks-postgres): Survey platform with survey definitions and responses

---

## Backup Scripts

### backup_database.sh
Creates compressed SQL dumps of **both** databases with matching timestamps.

**Usage:**
```bash
./backup_database.sh
```

**Features:**
- Creates timestamped backups in `./backups/` directory
- Backs up both kartierung and formbricks databases
- Compresses with gzip to save space
- Uses `--no-owner --no-acl` for better portability between servers

**Output:**
- Kartierung backup: `backups/kartierung_backup_YYYYMMDD_HHMMSS.sql.gz`
- Formbricks backup: `backups/formbricks_backup_YYYYMMDD_HHMMSS.sql.gz`

**Example:**
```bash
$ ./backup_database.sh
Starting database backups...
Timestamp: 20260609_143025

[1/2] Backing up Kartierung database...
  Container: bac-karierung-db
  Database: kartierung_db
  File: ./backups/kartierung_backup_20260609_143025.sql.gz
  ✓ Kartierung backup completed (2.3M)

[2/2] Backing up Formbricks database...
  Container: formbricks-postgres
  Database: formbricks
  File: ./backups/formbricks_backup_20260609_143025.sql.gz
  ✓ Formbricks backup completed (1.8M)
```

---

### restore_database.sh
Restores **both** database backups.

**Usage Option 1 - Using timestamp (recommended):**
```bash
./restore_database.sh 20260609_143025
```

**Usage Option 2 - Specify both files explicitly:**
```bash
./restore_database.sh \
  backups/kartierung_backup_20260609_143025.sql.gz \
  backups/formbricks_backup_20260609_143025.sql.gz
```

**Features:**
- Drops and recreates **both** databases (⚠️ destructive!)
- Prompts for confirmation before proceeding
- Automatically enables PostGIS extension (kartierung) and pgvector extension (formbricks)
- Verifies tables in both databases after restore
- Shows available backups when run without arguments

**⚠️ Warning:** This will completely replace both databases with the backup data. All current data will be lost!

---

## Quick Start

### Create a backup
```bash
./backup_database.sh
```

### List available backups
```bash
./restore_database.sh
# Shows all available backup timestamps
```

### Restore from a backup
```bash
./restore_database.sh 20260609_143025
```

---

## Server Migration

For complete server migration (including all data and surveys), see **[MIGRATION_GUIDE.md](MIGRATION_GUIDE.md)** for detailed step-by-step instructions.

**Quick migration:**
```bash
# On source server
./backup_database.sh
TIMESTAMP="20260609_143025"  # Use actual timestamp

# Transfer both backup files
scp backups/*_backup_${TIMESTAMP}.sql.gz user@newserver:/path/to/kartierung/backups/

# On destination server
./restore_database.sh ${TIMESTAMP}
```

---

## Alternative: Volume Backup (Full Binary Copy)

If you want to backup entire PostgreSQL data volumes (including all databases, users, configuration):

### Backup Both Volumes
```bash
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Backup Kartierung database volume
docker run --rm \
    -v kartierung_software_server_db_data:/data \
    -v $(pwd)/backups:/backup \
    alpine tar czf /backup/kartierung_volume_${TIMESTAMP}.tar.gz -C /data .

# Backup Formbricks database volume
docker run --rm \
    -v kartierung_software_server_formbricks_postgres:/data \
    -v $(pwd)/backups:/backup \
    alpine tar czf /backup/formbricks_volume_${TIMESTAMP}.tar.gz -C /data .

echo "Volume backups completed:"
echo "  kartierung_volume_${TIMESTAMP}.tar.gz"
echo "  formbricks_volume_${TIMESTAMP}.tar.gz"
```

### Restore Volumes
```bash
TIMESTAMP="20260609_143025"  # Replace with actual timestamp

# Stop both databases
docker-compose stop db formbricks-postgres

# Restore Kartierung volume
docker run --rm \
    -v kartierung_software_server_db_data:/data \
    -v $(pwd)/backups:/backup \
    alpine sh -c "cd /data && rm -rf * && tar xzf /backup/kartierung_volume_${TIMESTAMP}.tar.gz"

# Restore Formbricks volume
docker run --rm \
    -v kartierung_software_server_formbricks_postgres:/data \
    -v $(pwd)/backups:/backup \
    alpine sh -c "cd /data && rm -rf * && tar xzf /backup/formbricks_volume_${TIMESTAMP}.tar.gz"

# Start both databases
docker-compose up -d db formbricks-postgres
```

**Note:** Volume backups are faster but less portable between different PostgreSQL versions or configurations.

---

## Automated Backups (Cron)

To run backups automatically every day at 2 AM:

```bash
# Edit crontab
crontab -e

# Add this line (update path as needed):
0 2 * * * cd /home/andre/dev/kartierung_software_server && ./backup_database.sh >> ./backups/backup.log 2>&1
```

Consider backup retention:
```bash
# Clean up backups older than 30 days (add to cron after backup)
0 3 * * * find /home/andre/dev/kartierung_software_server/backups -name "*_backup_*.sql.gz" -mtime +30 -delete
```

---

## Troubleshooting

### Check Database Status

**Kartierung database:**
```bash
# Check if ready
docker exec bac-karierung-db pg_isready -U ${POSTGIS_USER} -d ${POSTGIS_DB}

# Check database size
docker exec bac-karierung-db psql -U ${POSTGIS_USER} -d ${POSTGIS_DB} -c "SELECT pg_size_pretty(pg_database_size('${POSTGIS_DB}'));"

# List all tables
docker exec bac-karierung-db psql -U ${POSTGIS_USER} -d ${POSTGIS_DB} -c "\dt"
```

**Formbricks database:**
```bash
# Check if ready
docker exec formbricks-postgres pg_isready -U postgres -d formbricks

# Check database size
docker exec formbricks-postgres psql -U postgres -d formbricks -c "SELECT pg_size_pretty(pg_database_size('formbricks'));"

# List all tables
docker exec formbricks-postgres psql -U postgres -d formbricks -c "\dt"
```

### Inspect Backup Files

**View backup contents:**
```bash
# Check kartierung backup
gunzip < backups/kartierung_backup_20260609_143025.sql.gz | head -n 50

# Check formbricks backup
gunzip < backups/formbricks_backup_20260609_143025.sql.gz | head -n 50
```

**Verify backup file integrity:**
```bash
gunzip -t backups/kartierung_backup_20260609_143025.sql.gz
gunzip -t backups/formbricks_backup_20260609_143025.sql.gz
```

### Common Issues

**Issue: "Database is not ready"**
- Wait for containers to fully start: `docker-compose logs -f db formbricks-postgres`
- Check container status: `docker-compose ps`

**Issue: Restore fails with permission errors**
- Ensure `.env` file has correct credentials
- Verify environment variables are loaded: `source .env && echo $POSTGIS_USER`

**Issue: Out of disk space**
- Check available space: `df -h`
- Remove old backups: `rm backups/old_backup_*.sql.gz`

---

## Best Practices

1. **Regular backups**: Run automated backups daily
2. **Test restores**: Periodically test backup restoration on a test server
3. **Off-site storage**: Copy backups to a different server or cloud storage
4. **Retention policy**: Keep at least 30 days of backups, monthly archives for 1 year
5. **Monitor backup size**: Watch for unexpected size changes (could indicate issues)
6. **Document restores**: Keep a log of when backups were created and tested
