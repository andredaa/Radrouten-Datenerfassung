# Server Migration Guide

This guide explains how to transfer the complete BAC Kartierung stack (including Formbricks surveys and data) from one server to another.

## Overview

The migration process involves:
1. **Backing up both databases** on the source server
2. **Transferring backup files** to the destination server
3. **Restoring both databases** on the destination server
4. **Transferring configuration files** (secrets)

## Components to Migrate

### Databases
- **bac-kartierung-db**: PostgreSQL with PostGIS (kartierung data)
- **formbricks-postgres**: PostgreSQL with pgvector (survey data and configurations)

### Configuration Files
- `.env` file (database credentials)
- `nginx.conf` (if customized)
- SSL certificates in `./certbot/certbot-etc/` (if applicable)
- Basic auth passwords in `./basic-auth-pw/` (if applicable)
- Formbricks secrets in docker-compose.yml

---

## Step-by-Step Migration

### On Source Server

#### 1. Create Backups

```bash
# Load environment variables
source .env

# Run backup script (creates both database backups)
./backup_database.sh
```

This creates two files with matching timestamps:
- `./backups/kartierung_backup_YYYYMMDD_HHMMSS.sql.gz`
- `./backups/formbricks_backup_YYYYMMDD_HHMMSS.sql.gz`

#### 2. Copy Required Files

Create a migration package:

```bash
# Create migration directory
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
MIGRATION_DIR="migration_${TIMESTAMP}"
mkdir -p "${MIGRATION_DIR}"

# Copy database backups (use your actual timestamp)
cp ./backups/kartierung_backup_YYYYMMDD_HHMMSS.sql.gz "${MIGRATION_DIR}/"
cp ./backups/formbricks_backup_YYYYMMDD_HHMMSS.sql.gz "${MIGRATION_DIR}/"

# Copy configuration files
cp .env "${MIGRATION_DIR}/"
cp docker-compose.yml "${MIGRATION_DIR}/"
cp nginx.conf "${MIGRATION_DIR}/" # if customized

# Copy SSL certificates (if using Let's Encrypt)
tar -czf "${MIGRATION_DIR}/certbot-data.tar.gz" ./certbot/certbot-etc/

# Copy basic auth passwords (if configured)
tar -czf "${MIGRATION_DIR}/basic-auth.tar.gz" ./basic-auth-pw/

# Create archive for transfer
tar -czf "${MIGRATION_DIR}.tar.gz" "${MIGRATION_DIR}"

echo "Migration package created: ${MIGRATION_DIR}.tar.gz"
```

#### 3. Transfer to Destination Server

```bash
# Transfer via SCP (replace with your destination server)
scp "${MIGRATION_DIR}.tar.gz" user@destination-server:/path/to/kartierung/

# Or use rsync for better reliability
rsync -avz --progress "${MIGRATION_DIR}.tar.gz" user@destination-server:/path/to/kartierung/
```

---

### On Destination Server

#### 1. Setup Project

```bash
# Clone repository or copy project files
git clone <repository-url> kartierung_software_server
cd kartierung_software_server

# Extract migration package
tar -xzf ../migration_YYYYMMDD_HHMMSS.tar.gz
cd migration_YYYYMMDD_HHMMSS
```

#### 2. Restore Configuration

```bash
# Copy configuration files
cp .env ../.env
cp docker-compose.yml ../docker-compose.yml  # Review and merge if needed
cp nginx.conf ../nginx.conf  # if customized

# Restore SSL certificates (if applicable)
tar -xzf certbot-data.tar.gz -C ../

# Restore basic auth (if applicable)
tar -xzf basic-auth.tar.gz -C ../

cd ..
```

#### 3. Update Configuration

Edit `.env` and `docker-compose.yml` for the new server:

```bash
nano .env
```

Update:
- Server hostname/IP in `WEBAPP_URL`
- Database passwords (if changed)
- Any server-specific paths

```bash
nano docker-compose.yml
```

Update in the `formbricks-environment` section:
- `WEBAPP_URL`: https://new-server-hostname
- `NEXTAUTH_URL`: https://new-server-hostname
- Regenerate secrets if needed:
  - `NEXTAUTH_SECRET`
  - `ENCRYPTION_KEY`
  - `CRON_SECRET`

#### 4. Start Containers

```bash
# Start all services
docker-compose up -d

# Wait for databases to be ready (check logs)
docker-compose logs -f db formbricks-postgres
```

Press Ctrl+C when both databases show "ready to accept connections"

#### 5. Restore Databases

```bash
# Load environment variables
source .env

# Restore both databases using the timestamp
./restore_database.sh YYYYMMDD_HHMMSS

# Or specify files explicitly
./restore_database.sh \
  ./migration_YYYYMMDD_HHMMSS/kartierung_backup_YYYYMMDD_HHMMSS.sql.gz \
  ./migration_YYYYMMDD_HHMMSS/formbricks_backup_YYYYMMDD_HHMMSS.sql.gz
```

When prompted, type `yes` to confirm the restore.

#### 6. Restart Services

```bash
# Restart all services to ensure everything is connected properly
docker-compose restart

# Check service status
docker-compose ps
```

#### 7. Verify Migration

Check that everything is working:

```bash
# Check Kartierung database
docker exec bac-karierung-db psql -U "${POSTGIS_USER}" -d "${POSTGIS_DB}" -c "\dt"

# Check Formbricks database  
docker exec formbricks-postgres psql -U postgres -d formbricks -c "\dt"

# Check service logs
docker-compose logs backend
docker-compose logs formbricks
```

Access the services:
- Frontend: `http://your-server/` or `https://your-server/`
- Formbricks: `https://your-server/` (login with existing credentials)

---

## Troubleshooting

### Database Connection Issues

If services can't connect to databases:

```bash
# Check if databases are running
docker-compose ps db formbricks-postgres

# Check database logs
docker-compose logs db
docker-compose logs formbricks-postgres

# Verify credentials in .env match docker-compose.yml
cat .env
```

### Formbricks Issues

If Formbricks shows errors after migration:

```bash
# Check Formbricks logs
docker-compose logs formbricks

# Restart Formbricks service
docker-compose restart formbricks
```

### SSL Certificate Issues

If using Let's Encrypt certificates:

```bash
# The certificates are domain-specific
# You may need to obtain new certificates for the new domain:
cd certbot
./certbot_init.sh
```

### Permission Issues

If you encounter permission errors:

```bash
# Fix ownership of volumes
sudo chown -R $(id -u):$(id -g) ./certbot
sudo chown -R $(id -u):$(id -g) ./basic-auth-pw
```

---

## Verification Checklist

After migration, verify:

- [ ] Kartierung frontend loads correctly
- [ ] Map data displays properly
- [ ] Backend API responds
- [ ] Formbricks admin panel accessible
- [ ] Existing surveys are visible
- [ ] Survey responses are preserved
- [ ] User accounts work (if applicable)
- [ ] SSL certificates work (https://)
- [ ] All routes/pages accessible

---

## Regular Backups

On the new server, set up automatic backups:

```bash
# Add to crontab for daily backups at 2 AM
crontab -e
```

Add this line:
```
0 2 * * * cd /path/to/kartierung_software_server && ./backup_database.sh >> /var/log/kartierung_backup.log 2>&1
```

---

## Notes

- **Backup retention**: Keep backups for at least 30 days
- **Test restores**: Periodically test backup restoration on a test server
- **Secrets**: Always regenerate `NEXTAUTH_SECRET`, `ENCRYPTION_KEY`, and `CRON_SECRET` in production
- **Database compatibility**: Ensure PostgreSQL versions match or the destination is newer
