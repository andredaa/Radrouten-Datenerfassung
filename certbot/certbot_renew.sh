LOG_FILE="$(pwd)/certbot.log"

echo "Starting Certbot renewal process..."
docker run --rm \
    -v $(pwd)/certbot-etc:/etc/letsencrypt \
    -v $(pwd)/certbot-var:/var/lib/letsencrypt \
    -v $(pwd)/certbot-temp:/var/www/certbot \
    certbot/certbot renew >> $LOG_FILE 2>&1
docker compose up --build nginx >> $LOG_FILE 2>&1
echo "Certbot renewal process completed!" >> $LOG_FILE