LOG_FILE="$(pwd)/certbot.log"
echo "Starting Certbot init process..."  >> $LOG_FILE 2>&1

docker run -d \
  --name nginx \
  -p 80:80 \
  -p 443:443 \
  -v $(pwd)/nginx_certbot_init.conf:/etc/nginx/conf.d/default.conf:ro \
  nginx:alpin

docker run --rm \
    -v $(pwd)/certbot-etc:/etc/letsencrypt \
    -v $(pwd)/certbot-var:/var/lib/letsencrypt \
    -v $(pwd)/certbot-temp:/var/www/certbot \
    certbot/certbot certonly --webroot -w /var/www/certbot \
    -d bike-access-check.uni-hamburg.de --email andre.landwehr@uni-hamburg.de --agree-tos --no-eff-email
