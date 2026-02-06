#!/bin/bash
set -euo pipefail

MIGRATION_NAME="${1:-auto}"
TIMESTAMP=$(date +%Y%m%d%H%M%S)
MIGRATION_DIR="./migrations"

echo "=== The Maestro - Migration Generator ==="
echo "Migration: ${MIGRATION_NAME}"
echo "Timestamp: ${TIMESTAMP}"
echo ""

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL not set."
  exit 1
fi

echo "Step 1: Validating schema compiles..."
npx tsc --noEmit --skipLibCheck shared/schema.ts
echo "Schema validation passed."

echo ""
echo "Step 2: Generating migration..."
npx drizzle-kit generate --name "${TIMESTAMP}_${MIGRATION_NAME}"

echo ""
echo "Step 3: Listing migrations..."
ls -la "${MIGRATION_DIR}/" 2>/dev/null || echo "No migrations directory yet."

echo ""
echo "=== Migration generated successfully ==="
echo "Review the generated SQL in ${MIGRATION_DIR}/ before applying."
echo ""
echo "To apply:"
echo "  npx drizzle-kit migrate"
echo ""
echo "To push directly (development):"
echo "  npm run db:push"
