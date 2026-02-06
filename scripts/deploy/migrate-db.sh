#!/bin/bash
set -e

echo "=== Database Migration ==="
echo "Date: $(date)"

if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL not set"
  exit 1
fi

echo "[1/3] Current schema state..."
npx drizzle-kit introspect 2>/dev/null || echo "  No existing schema found."

echo ""
echo "[2/3] Pushing schema changes..."
npm run db:push --force

echo ""
echo "[3/3] Migration complete."
echo "=== Done ==="
