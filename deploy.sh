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

echo "→ Restarting PM2..."
pm2 restart dattingcoffe-1 dattingcoffe-2 2>/dev/null || pm2 start ecosystem.config.js

echo "✓ Deploy selesai!"
