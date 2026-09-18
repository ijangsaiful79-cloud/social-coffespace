#!/bin/bash
set -e

echo "→ Pulling latest code..."
git pull origin main

echo "→ Installing dependencies..."
npm ci --omit=dev 2>/dev/null || npm install --omit=dev

echo "→ Building..."
npm run build

echo "→ Copying static assets to standalone..."
cp -r .next/static .next/standalone/.next/
cp -r public .next/standalone/ 2>/dev/null || true

echo "→ Restarting PM2..."
pm2 restart dattingcoffe

echo "✓ Deploy selesai!"
