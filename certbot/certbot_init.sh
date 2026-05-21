LOG_FILE="$(pwd)/certbot.log"
echo "Starting Certbot init process..."  >> $LOG_FILE 2>&1
docker run --rm \
    -v $(pwd)/certbot-etc:/etc/letsencrypt \
    -v $(pwd)/certbot-var:/var/lib/letsencrypt \
    -v $(pwd)/certbot-temp:/var/www/certbot \
    certbot/certbot certonly --webroot -w /var/www/certbot \
    -d bike-access-check.uni-hamburg.de --email andre.landwehr@uni-hamburg.de --agree-tos --no-eff-email
