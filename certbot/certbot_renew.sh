#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_FILE="$SCRIPT_DIR/certbot.log"

echo "Starting Certbot renewal process..." | tee -a "$LOG_FILE"
docker run --rm \
    -v "$SCRIPT_DIR/certbot-etc":/etc/letsencrypt \
    -v "$SCRIPT_DIR/certbot-var":/var/lib/letsencrypt \
    -v "$SCRIPT_DIR/certbot-temp":/var/www/certbot \
    certbot/certbot renew --force-renewal 2>&1 | tee -a "$LOG_FILE"
docker compose -f "$SCRIPT_DIR/../docker-compose.yml" restart nginx 2>&1 | tee -a "$LOG_FILE"
echo "Certbot renewal process completed!" | tee -a "$LOG_FILE"