#!/bin/bash

# Deployment script for kartierung software server
# Usage: ./deploy-with-secrets.sh <user_id> <nextauth_secret> <encryption_key> <cron_secret>

set -e  # Exit on error

# Check if all arguments are provided
if [ "$#" -ne 4 ]; then
    echo "Usage: $0 <user_id> <nextauth_secret> <encryption_key> <cron_secret>"
    echo ""
    echo "Arguments:"
    echo "  user_id          - User ID for fixing certbot permissions"
    echo "  nextauth_secret  - NextAuth secret for Formbricks"
    echo "  encryption_key   - Encryption key for Formbricks"
    echo "  cron_secret      - Cron secret for Formbricks"
    exit 1
fi

USER_ID="$1"
NEXTAUTH_SECRET="$2"
ENCRYPTION_KEY="$3"
CRON_SECRET="$4"

echo "=========================================="
echo "Starting deployment..."
echo "=========================================="

# Step 1: Stop all running containers
echo "[1/5] Stopping containers..."
docker compose down

# Step 2: Fix certbot file permissions
echo "[2/5] Fixing certbot file permissions for user ID: $USER_ID..."
# Create temporary docker-compose file with the user ID
cat > temp-fix-permissions-runtime.yml << EOF
services:
  fix-perms:
    image: alpine
    command: chown -R $USER_ID:$USER_ID ./certbot
    volumes:
      - ./certbot:/certbot
EOF

docker compose -f temp-fix-permissions-runtime.yml run --rm fix-perms
rm temp-fix-permissions-runtime.yml

# Step 3: Pull latest code from git
echo "[3/5] Pulling latest code from git..."
git pull

# Step 4: Update secrets in docker-compose.yml
echo "[4/5] Updating secrets in docker-compose.yml..."
# Create backup
cp docker-compose.yml docker-compose.yml.backup

# Replace secrets using sed
sed -i "s|NEXTAUTH_SECRET:.*|NEXTAUTH_SECRET: $NEXTAUTH_SECRET|" docker-compose.yml
sed -i "s|ENCRYPTION_KEY:.*|ENCRYPTION_KEY: $ENCRYPTION_KEY|" docker-compose.yml
sed -i "s|CRON_SECRET:.*|CRON_SECRET: $CRON_SECRET|" docker-compose.yml

echo "Secrets updated successfully!"

# Step 5: Build and start containers
echo "[5/5] Building and starting containers..."
docker compose up --build -d

echo "=========================================="
echo "Deployment completed successfully!"
echo "=========================================="
echo ""
echo "Backup of previous docker-compose.yml saved as docker-compose.yml.backup"
echo ""
echo "To view logs, run: docker compose logs -f"
