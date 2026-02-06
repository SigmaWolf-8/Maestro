#!/bin/bash
set -e

echo "=== The Maestro ERP - Replit Deployment ==="
echo "Date: $(date)"
echo ""

echo "[1/5] Checking environment..."
if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL not set"
  exit 1
fi
echo "  DATABASE_URL: configured"
echo "  NODE_ENV: ${NODE_ENV:-development}"

echo ""
echo "[2/5] Installing dependencies..."
npm ci --production=false

echo ""
echo "[3/5] Running database migrations..."
npm run db:push --force

echo ""
echo "[4/5] Building application..."
npm run build

echo ""
echo "[5/5] Starting application..."
npm run start

echo ""
echo "=== Deployment complete ==="
