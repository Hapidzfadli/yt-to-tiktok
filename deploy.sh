#!/usr/bin/env bash
set -euo pipefail

DOMAIN="yt-tiktok.pro"

echo "=== [1/5] Install Docker ==="
if ! command -v docker &>/dev/null; then
  curl -fsSL https://get.docker.com | sh
  sudo usermod -aG docker "$USER"
  echo "Docker installed. Re-run this script after logging out & back in."
  exit 0
fi

echo "=== [2/5] Install Nginx & Certbot ==="
sudo apt-get update -qq
sudo apt-get install -y nginx certbot python3-certbot-nginx

echo "=== [3/5] Setup .env ==="
if [ ! -f .env ]; then
  cp .env.example .env
  FERNET=$(python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())")
  sed -i "s|^FERNET_KEY=.*|FERNET_KEY=${FERNET}|" .env
  sed -i "s|^APP_ENV=.*|APP_ENV=prod|" .env
  sed -i "s|http://localhost:3000|https://${DOMAIN}|g" .env
  sed -i "s|http://localhost:8000|https://${DOMAIN}|g" .env
  echo ""
  echo ">>> .env dibuat. Edit dulu sebelum lanjut:"
  echo "    nano .env   (isi POSTGRES_PASSWORD, AWS credentials, TIKTOK_CLIENT_KEY/SECRET)"
  echo ""
  echo "Setelah selesai, jalankan lagi: bash deploy.sh"
  exit 0
fi

echo "=== [4/5] Setup Nginx ==="
sudo cp nginx.conf /etc/nginx/sites-available/${DOMAIN}
sudo ln -sf /etc/nginx/sites-available/${DOMAIN} /etc/nginx/sites-enabled/${DOMAIN}
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx

echo "=== [4b] SSL via Certbot ==="
sudo certbot --nginx -d ${DOMAIN} -d www.${DOMAIN} --non-interactive --agree-tos -m admin@${DOMAIN} || true

echo "=== [5/5] Build & Start Docker services ==="
docker compose -f docker-compose.yml -f docker-compose.prod.yml build
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

echo ""
echo "=== DONE ==="
echo "API  : https://${DOMAIN}/api/docs"
echo "Web  : https://${DOMAIN}"
echo ""
echo "Logs : docker compose logs -f api worker"
