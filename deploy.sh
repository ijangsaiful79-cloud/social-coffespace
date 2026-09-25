#!/bin/bash
set -e

# Fix CRLF jika script di-push dari Windows
sed -i 's/\r//' "$0" 2>/dev/null || true

echo "→ Pulling latest code..."
git pull origin main

# Normalize line endings pada file kritis setelah pull
sed -i 's/\r//' ecosystem.config.js nginx.conf 2>/dev/null || true

echo "→ Installing dependencies..."
npm ci --omit=dev 2>/dev/null || npm install --omit=dev

echo "→ Building..."
npm run build

echo "→ Copying static assets to standalone..."
cp -r .next/static .next/standalone/.next/
cp -r public .next/standalone/ 2>/dev/null || true
cp .env.local .next/standalone/.env.local 2>/dev/null || true

echo "→ Restarting PM2..."
pm2 delete all 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save

echo "✓ Deploy selesai!"
